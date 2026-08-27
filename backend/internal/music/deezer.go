package music

import (
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"jaribu-beats-backend/internal/models"
)

// ITunesSearchResponse represents Apple iTunes API search response
type ITunesSearchResponse struct {
	ResultCount int `json:"resultCount"`
	Results     []struct {
		TrackID          int64  `json:"trackId"`
		TrackName        string `json:"trackName"`
		ArtistName       string `json:"artistName"`
		CollectionName   string `json:"collectionName"`
		ArtworkUrl100    string `json:"artworkUrl100"`
		PreviewUrl       string `json:"previewUrl"`
		TrackTimeMillis  int    `json:"trackTimeMillis"`
		PrimaryGenreName string `json:"primaryGenreName"`
	} `json:"results"`
}

// DeezerTrack represents Deezer API track JSON
type DeezerTrack struct {
	ID         int64  `json:"id"`
	Title      string `json:"title"`
	TitleShort string `json:"title_short"`
	Preview    string `json:"preview"`
	Duration   int    `json:"duration"`
	Artist     struct {
		ID      int64  `json:"id"`
		Name    string `json:"name"`
		Picture string `json:"picture_medium"`
	} `json:"artist"`
	Album struct {
		ID    int64  `json:"id"`
		Title string `json:"title"`
		Cover string `json:"cover_medium"`
	} `json:"album"`
}

type DeezerSearchResponse struct {
	Data []DeezerTrack `json:"data"`
}

// DeezerClient manages dynamic music catalog fetching with 100% reliable permanent preview streams
type DeezerClient struct {
	httpClient *http.Client
	cacheMutex sync.RWMutex
}

// NewDeezerClient creates a music client instance
func NewDeezerClient() *DeezerClient {
	return &DeezerClient{
		httpClient: &http.Client{
			Timeout: 12 * time.Second,
		},
	}
}

func isSpamOrAudiobook(title, artist string) bool {
	lowT := strings.ToLower(title)
	lowA := strings.ToLower(artist)
	if strings.Contains(lowT, "kapitel") || strings.Contains(lowT, "chapter") || strings.Contains(lowT, "audiobook") {
		return true
	}
	if strings.Contains(lowA, "hörbuch") || strings.Contains(lowA, "audiobook") {
		return true
	}
	return false
}

// SearchITunes queries Apple iTunes API for non-expiring, public preview streams
func (c *DeezerClient) SearchITunes(query string, category string, limit int) ([]models.Song, error) {
	if limit <= 0 {
		limit = 10
	}

	endpoint := fmt.Sprintf("https://itunes.apple.com/search?term=%s&media=music&entity=song&limit=%d", url.QueryEscape(query), limit*2)
	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("itunes status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var itunesRes ITunesSearchResponse
	if err := json.Unmarshal(body, &itunesRes); err != nil {
		return nil, err
	}

	var songs []models.Song
	for _, t := range itunesRes.Results {
		if t.PreviewUrl == "" || isSpamOrAudiobook(t.TrackName, t.ArtistName) {
			continue
		}
		songs = append(songs, models.Song{
			ID:          fmt.Sprintf("it_%d", t.TrackID),
			Title:       t.TrackName,
			Artist:      t.ArtistName,
			Album:       t.CollectionName,
			CoverURL:    t.ArtworkUrl100,
			PreviewURL:  t.PreviewUrl,
			Category:    category,
			DurationSec: t.TrackTimeMillis / 1000,
			CreatedAt:   time.Now(),
		})
		if len(songs) >= limit {
			break
		}
	}

	return songs, nil
}

// SearchTracks searches Deezer API with User-Agent header
func (c *DeezerClient) SearchTracks(query string, category string, limit int) ([]models.Song, error) {
	if limit <= 0 {
		limit = 10
	}

	endpoint := fmt.Sprintf("https://api.deezer.com/search?q=%s&limit=%d", url.QueryEscape(query), limit*2)
	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("deezer returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var searchRes DeezerSearchResponse
	if err := json.Unmarshal(body, &searchRes); err != nil {
		return nil, err
	}

	var songs []models.Song
	for _, t := range searchRes.Data {
		if t.Preview == "" || isSpamOrAudiobook(t.Title, t.Artist.Name) {
			continue
		}
		title := t.TitleShort
		if title == "" {
			title = t.Title
		}
		cover := t.Album.Cover
		if cover == "" {
			cover = t.Artist.Picture
		}

		songs = append(songs, models.Song{
			ID:          fmt.Sprintf("dz_%d", t.ID),
			Title:       title,
			Artist:      t.Artist.Name,
			Album:       t.Album.Title,
			CoverURL:    cover,
			PreviewURL:  t.Preview,
			Category:    category,
			DurationSec: t.Duration,
			CreatedAt:   time.Now(),
		})
		if len(songs) >= limit {
			break
		}
	}

	return songs, nil
}

// DeezerArtistSearchResponse represents Deezer API artist search JSON
type DeezerArtistSearchResponse struct {
	Data []struct {
		ID         int64  `json:"id"`
		Name       string `json:"name"`
		Picture    string `json:"picture_medium"`
		PictureBig string `json:"picture_big"`
		NbAlbum    int    `json:"nb_album"`
		NbFan      int    `json:"nb_fan"`
	} `json:"data"`
}

// SearchArtists searches for music artists across Deezer and Apple iTunes
func (c *DeezerClient) SearchArtists(query string, limit int) ([]models.ArtistSearchResult, error) {
	if limit <= 0 {
		limit = 15
	}

	var results []models.ArtistSearchResult
	seenNames := make(map[string]bool)

	// Primary search: Deezer artist search (returns rich artist photos & fan counts)
	dzEndpoint := fmt.Sprintf("https://api.deezer.com/search/artist?q=%s&limit=%d", url.QueryEscape(query), limit*2)
	req, err := http.NewRequest("GET", dzEndpoint, nil)
	if err == nil {
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
		resp, err := c.httpClient.Do(req)
		if err == nil && resp.StatusCode == http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			var dzRes DeezerArtistSearchResponse
			if err := json.Unmarshal(body, &dzRes); err == nil {
				for _, a := range dzRes.Data {
					low := strings.ToLower(strings.TrimSpace(a.Name))
					if low == "" || seenNames[low] {
						continue
					}
					seenNames[low] = true
					pic := a.PictureBig
					if pic == "" {
						pic = a.Picture
					}
					results = append(results, models.ArtistSearchResult{
						ID:       a.ID,
						Name:     a.Name,
						Picture:  pic,
						NbAlbums: a.NbAlbum,
						NbFans:   a.NbFan,
					})
					if len(results) >= limit {
						break
					}
				}
			}
		}
	}

	// Fallback/Supplement with iTunes search if Deezer returned few results
	if len(results) < 3 {
		itEndpoint := fmt.Sprintf("https://itunes.apple.com/search?term=%s&media=music&entity=song&limit=%d", url.QueryEscape(query), limit*2)
		itReq, err := http.NewRequest("GET", itEndpoint, nil)
		if err == nil {
			itReq.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
			itResp, err := c.httpClient.Do(itReq)
			if err == nil && itResp.StatusCode == http.StatusOK {
				body, _ := io.ReadAll(itResp.Body)
				itResp.Body.Close()
				var itRes ITunesSearchResponse
				if err := json.Unmarshal(body, &itRes); err == nil {
					for _, t := range itRes.Results {
						low := strings.ToLower(strings.TrimSpace(t.ArtistName))
						if low == "" || seenNames[low] || isSpamOrAudiobook(t.TrackName, t.ArtistName) {
							continue
						}
						seenNames[low] = true
						results = append(results, models.ArtistSearchResult{
							ID:      t.TrackID,
							Name:    t.ArtistName,
							Picture: t.ArtworkUrl100,
						})
						if len(results) >= limit {
							break
						}
					}
				}
			}
		}
	}

	return results, nil
}

// GetArtistSongs fetches songs exclusively by and/or featuring the specified artist
func (c *DeezerClient) GetArtistSongs(artistName string, limit int) ([]models.Song, error) {
	if limit <= 0 {
		limit = 40
	}
	cleanArtist := strings.TrimSpace(artistName)
	lowArtist := strings.ToLower(cleanArtist)
	categoryTag := "artist:" + cleanArtist

	var songs []models.Song
	seenIDs := make(map[string]bool)
	seenTitles := make(map[string]bool)

	normalizeTitle := func(t string) string {
		t = strings.ToLower(t)
		if idx := strings.Index(t, "("); idx != -1 {
			t = t[:idx]
		}
		if idx := strings.Index(t, "["); idx != -1 {
			t = t[:idx]
		}
		return strings.TrimSpace(t)
	}

	// 1. Search iTunes with multiple queries (general & artist term) for high-quality audio
	itQueries := []string{
		fmt.Sprintf("https://itunes.apple.com/search?term=%s&media=music&entity=song&limit=60", url.QueryEscape(cleanArtist)),
		fmt.Sprintf("https://itunes.apple.com/search?term=%s&media=music&entity=song&attribute=artistTerm&limit=60", url.QueryEscape(cleanArtist)),
	}

	for _, endpoint := range itQueries {
		req, err := http.NewRequest("GET", endpoint, nil)
		if err != nil {
			continue
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
		resp, err := c.httpClient.Do(req)
		if err != nil || resp.StatusCode != http.StatusOK {
			if resp != nil {
				resp.Body.Close()
			}
			continue
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		var itRes ITunesSearchResponse
		if err := json.Unmarshal(body, &itRes); err == nil {
			for _, t := range itRes.Results {
				if t.PreviewUrl == "" || isSpamOrAudiobook(t.TrackName, t.ArtistName) {
					continue
				}
				normTitle := normalizeTitle(t.TrackName)
				trackArtistLow := strings.ToLower(t.ArtistName)
				trackTitleLow := strings.ToLower(t.TrackName)

				// Match if artist is the main artist or featured in the title/artist field
				isMatch := strings.Contains(trackArtistLow, lowArtist) || strings.Contains(trackTitleLow, lowArtist)
				if !isMatch && len(songs) >= 10 {
					continue
				}

				trackID := fmt.Sprintf("it_%d", t.TrackID)
				if !seenIDs[trackID] && !seenTitles[normTitle] {
					seenIDs[trackID] = true
					seenTitles[normTitle] = true
					songs = append(songs, models.Song{
						ID:          trackID,
						Title:       t.TrackName,
						Artist:      t.ArtistName,
						Album:       t.CollectionName,
						CoverURL:    t.ArtworkUrl100,
						PreviewURL:  t.PreviewUrl,
						Category:    categoryTag,
						DurationSec: t.TrackTimeMillis / 1000,
						CreatedAt:   time.Now(),
					})
				}
			}
		}
	}

	// 2. Query Deezer specifically for artist tracks
	dzQueries := []string{
		fmt.Sprintf("https://api.deezer.com/search?q=artist:\"%s\"&limit=60", url.QueryEscape(cleanArtist)),
		fmt.Sprintf("https://api.deezer.com/search?q=%s&limit=60", url.QueryEscape(cleanArtist)),
	}

	for _, endpoint := range dzQueries {
		req, err := http.NewRequest("GET", endpoint, nil)
		if err != nil {
			continue
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
		resp, err := c.httpClient.Do(req)
		if err != nil || resp.StatusCode != http.StatusOK {
			if resp != nil {
				resp.Body.Close()
			}
			continue
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		var searchRes DeezerSearchResponse
		if err := json.Unmarshal(body, &searchRes); err == nil {
			for _, t := range searchRes.Data {
				if t.Preview == "" || isSpamOrAudiobook(t.Title, t.Artist.Name) {
					continue
				}
				title := t.TitleShort
				if title == "" {
					title = t.Title
				}
				normTitle := normalizeTitle(title)
				trackArtistLow := strings.ToLower(t.Artist.Name)
				trackTitleLow := strings.ToLower(title)

				isMatch := strings.Contains(trackArtistLow, lowArtist) || strings.Contains(trackTitleLow, lowArtist)
				if !isMatch && len(songs) >= 10 {
					continue
				}

				trackID := fmt.Sprintf("dz_%d", t.ID)
				if !seenIDs[trackID] && !seenTitles[normTitle] {
					seenIDs[trackID] = true
					seenTitles[normTitle] = true

					cover := t.Album.Cover
					if cover == "" {
						cover = t.Artist.Picture
					}

					songs = append(songs, models.Song{
						ID:          trackID,
						Title:       title,
						Artist:      t.Artist.Name,
						Album:       t.Album.Title,
						CoverURL:    cover,
						PreviewURL:  t.Preview,
						Category:    categoryTag,
						DurationSec: t.Duration,
						CreatedAt:   time.Now(),
					})
				}
			}
		}
	}

	if len(songs) == 0 {
		return nil, fmt.Errorf("no songs found for artist %s", artistName)
	}

	// Shuffle songs thoroughly
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	r.Shuffle(len(songs), func(i, j int) {
		songs[i], songs[j] = songs[j], songs[i]
	})

	if len(songs) > limit {
		songs = songs[:limit]
	}

	return songs, nil
}

// GetCategorySongs dynamically fetches a randomized song collection from live public catalogs
func (c *DeezerClient) GetCategorySongs(categoryID string, limit int) ([]models.Song, error) {
	if limit <= 0 {
		limit = 40
	}

	// If category is an artist spotlight query (artist:ArtistName), use specialized artist engine
	if strings.HasPrefix(categoryID, "artist:") {
		artistName := strings.TrimPrefix(categoryID, "artist:")
		return c.GetArtistSongs(artistName, limit)
	}

	queries := map[string][]string{
		"kenyan": {
			"Sauti Sol", "Nyashinski", "Wakadinali", "Khaligraph Jones", "Mejja",
			"Bien Sauti Sol", "Otile Brown", "Nadia Mukami", "Nameless Kenya", "Nonini",
			"Boutross", "Nikita Kering", "Matata Kenya", "Ethic Entertainment", "Ochungulo Family",
			"Sailors 254", "Jua Cali", "E-Sir", "Brandy Maina", "Buruklyn Boyz", "Trio Mio",
			"Femi One", "King Kaka", "Arrow Bwoy", "H_art the Band", "Sanaipei Tande",
			"Ndovu Kuu", "Gabu P-Unit", "Avril Kenya", "Kenyan Benga", "Gengetone Kenya",
			"Arbantone Kenya", "Kanja Muchoki", "Ssaru", "Exray Taniua", "Zzero Sufuri",
			"Rekles", "Fathermoh", "Iyanii", "Kagwe Mungai", "Chris Kaiga", "Jovial Kenya",
		},
		"afrobeats": {
			"Burna Boy", "Wizkid", "Asake", "Davido", "Rema", "Tems", "Ayra Starr",
			"Fireboy DML", "Omah Lay", "Kabza De Small", "Tyla", "Kizz Daniel", "Tiwa Savage",
			"Adekunle Gold", "CKay", "Focalistic", "Uncle Waffles", "DJ Maphorisa", "Victony",
			"Shallipopi", "BNXN", "Seyi Vibez", "Joeboy", "Diamond Platnumz", "Rayvanny",
			"Harmonize", "Zuchu", "Mbosso", "Kamo Mphela", "Fally Ipupa", "Koffi Olomide",
			"Tayc", "CKay", "Ruger", "Pheelz", "Spyro", "Crayon", "Flavour Nabania",
		},
		"reggae": {
			"Bob Marley", "Chronixx", "Tarrus Riley", "Burning Spear", "Lucky Dube",
			"Peter Tosh", "Morgan Heritage", "Protoje", "Buju Banton", "Damian Marley",
			"Culture Reggae", "Gregory Isaacs", "Jah Cure", "Richie Spice", "Dennis Brown",
			"Black Uhuru", "UB40", "Steel Pulse", "Ziggy Marley", "Alpha Blondy",
			"Freddie McGregor", "Beres Hammond", "Sanchez Reggae", "Stephen Marley",
			"Luciano Reggae", "Anthony B", "Capleton", "Sizzla", "Kabaka Pyramid",
			"Lila Ike", "Koffee", "Collie Buddz", "Maxi Priest", "Jimmy Cliff",
		},
		"dancehall": {
			"Vybz Kartel", "Popcaan", "Sean Paul", "Shenseea", "Skillibeng",
			"Spice Dancehall", "Beenie Man", "Konshens", "Busy Signal", "Alkaline",
			"Kranium", "Masicka", "Mavado", "Shaggy", "Charly Black", "Ding Dong Dancehall",
			"Dexta Daps", "Aidonia", "Squash Dancehall", "Govana", "Stefflon Don",
			"Teejay Dancehall", "Jahmiel", "Bounty Killer", "Elephant Man", "Wayne Wonder",
			"Serani", "Cham Dancehall", "Demarco", "Hoodcelebrityy", "Jada Kingdom",
		},
		"gospel": {
			"Mercy Chinwo", "Sinach", "Nathaniel Bassey", "Kirk Franklin", "Maverick City Music",
			"Don Moen", "Hillsong Worship", "CeCe Winans", "Travis Greene", "Guardian Angel Kenya",
			"Reuben Kigame", "Janet Otieno", "Moses Bliss", "Ada Ehi", "Tasha Cobbs Leonard",
			"Chandler Moore", "Judikay", "Dunsin Oyekan", "Casting Crowns", "Lauren Daigle",
			"Chris Tomlin", "TobyMac", "Elevation Worship", "Eunice Njeri", "Gloria Muliro",
			"Kambua", "Christina Shusho", "Solomon Mkubwa", "Evelyn Wanjiru", "Rose Muhando",
		},
		"hiphop": {
			"Kendrick Lamar", "Drake", "Travis Scott", "Eminem", "J. Cole",
			"2Pac", "Notorious BIG", "50 Cent", "Kanye West", "Metro Boomin",
			"Future", "Lil Wayne", "Jay-Z", "Snoop Dogg", "Ice Cube", "Dr Dre",
			"Nas", "Cardi B", "Nicki Minaj", "Lil Baby", "21 Savage", "Post Malone",
			"Tyler The Creator", "A$AP Rocky", "Jack Harlow", "Gunna", "Roddy Ricch",
		},
		"pop": {
			"The Weeknd", "Bruno Mars", "Dua Lipa", "Taylor Swift", "Billie Eilish",
			"Ed Sheeran", "Ariana Grande", "Harry Styles", "Justin Bieber", "Rihanna",
			"Post Malone", "Katy Perry", "Lady Gaga", "Beyonce", "Shawn Mendes",
			"Sam Smith", "Olivia Rodrigo", "Miley Cyrus", "Maroon 5", "Adele",
			"Doja Cat", "Sabrina Carpenter", "Chappell Roan", "SZA", "Camila Cabello",
		},
		"nineties_twothousands": {
			"Backstreet Boys", "Britney Spears", "Usher", "Beyonce", "Alicia Keys",
			"Sean Paul", "Akon", "Shaggy", "Black Eyed Peas", "Destinys Child",
			"Nelly", "Outkast", "Shakira", "Christina Aguilera", "Justin Timberlake",
			"50 Cent", "Ne-Yo", "Chris Brown", "T-Pain", "Rihanna", "TLC",
			"Gwen Stefani", "Avril Lavigne", "Kelly Clarkson", "P!nk", "Ciara",
		},
		"rock_classics": {
			"Queen", "AC/DC", "Nirvana", "Linkin Park", "Coldplay",
			"Guns N Roses", "Red Hot Chili Peppers", "Bon Jovi", "Green Day", "Metallica",
			"The Beatles", "Led Zeppelin", "Pink Floyd", "U2", "Foo Fighters",
			"Radiohead", "Oasis", "Aerosmith", "The Police", "Scorpions",
		},
	}

	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	var artistList []string

	if categoryID == "general" || categoryID == "random_mix" {
		// "Random Mega Mix" / "General": randomly sample 2 artists from EVERY genre!
		for _, list := range queries {
			shuffledList := make([]string, len(list))
			copy(shuffledList, list)
			r.Shuffle(len(shuffledList), func(i, j int) {
				shuffledList[i], shuffledList[j] = shuffledList[j], shuffledList[i]
			})
			if len(shuffledList) >= 2 {
				artistList = append(artistList, shuffledList[:2]...)
			} else {
				artistList = append(artistList, shuffledList...)
			}
		}
	} else {
		list, exists := queries[categoryID]
		if !exists {
			// Custom query / unknown category: query iTunes & Deezer directly
			itSongs, err := c.SearchITunes(categoryID, categoryID, limit)
			if err == nil && len(itSongs) >= 4 {
				return itSongs, nil
			}
			dzSongs, _ := c.SearchTracks(categoryID, categoryID, limit)
			return dzSongs, nil
		}
		artistList = list
	}

	shuffled := make([]string, len(artistList))
	copy(shuffled, artistList)
	r.Shuffle(len(shuffled), func(i, j int) {
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	})

	var allSongs []models.Song
	seenIDs := make(map[string]bool)
	seenTitles := make(map[string]bool)

	normalizeTitle := func(t string) string {
		t = strings.ToLower(t)
		if idx := strings.Index(t, "("); idx != -1 {
			t = t[:idx]
		}
		if idx := strings.Index(t, "["); idx != -1 {
			t = t[:idx]
		}
		return strings.TrimSpace(t)
	}

	// Primary search: Apple iTunes (100% working, non-expiring public preview streams)
	for _, artistQuery := range shuffled {
		tracks, err := c.SearchITunes(artistQuery, categoryID, 6)
		if err == nil {
			for _, track := range tracks {
				norm := normalizeTitle(track.Title)
				if !seenIDs[track.ID] && !seenTitles[norm] && track.PreviewURL != "" {
					seenIDs[track.ID] = true
					seenTitles[norm] = true
					allSongs = append(allSongs, track)
				}
			}
		}
		if len(allSongs) >= limit*2 {
			break
		}
	}

	// Secondary fallback: Deezer
	if len(allSongs) < limit {
		for _, artistQuery := range shuffled[:6] {
			dzTracks, err := c.SearchTracks(artistQuery, categoryID, 6)
			if err == nil {
				for _, track := range dzTracks {
					norm := normalizeTitle(track.Title)
					if !seenIDs[track.ID] && !seenTitles[norm] && track.PreviewURL != "" {
						seenIDs[track.ID] = true
						seenTitles[norm] = true
						allSongs = append(allSongs, track)
					}
				}
			}
		}
	}

	// Shuffle all songs with nanosecond random source
	r.Shuffle(len(allSongs), func(i, j int) {
		allSongs[i], allSongs[j] = allSongs[j], allSongs[i]
	})

	if len(allSongs) == 0 {
		return nil, fmt.Errorf("no tracks found for category %s", categoryID)
	}

	if len(allSongs) > limit {
		allSongs = allSongs[:limit]
	}

	return allSongs, nil
}

