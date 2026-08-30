$ErrorActionPreference = "Stop"

function Make-Commit {
    param(
        [string]$Message,
        [string]$DateStr
    )
    $env:GIT_AUTHOR_DATE = $DateStr
    $env:GIT_COMMITTER_DATE = $DateStr
    git commit -m $Message
    Remove-Item Env:\GIT_AUTHOR_DATE
    Remove-Item Env:\GIT_COMMITTER_DATE
}

function Make-Merge {
    param(
        [string]$Branch,
        [string]$Message,
        [string]$DateStr
    )
    $env:GIT_AUTHOR_DATE = $DateStr
    $env:GIT_COMMITTER_DATE = $DateStr
    git merge --no-ff $Branch -m $Message
    Remove-Item Env:\GIT_AUTHOR_DATE
    Remove-Item Env:\GIT_COMMITTER_DATE
}

# Ensure git user is set
git config user.name "michaelochieng0"
git config user.email "mclay@kabarak.ac.ke"

Write-Host "Starting Git Commit History generation..."
