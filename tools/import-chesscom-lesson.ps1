param(
    [Parameter(Mandatory = $true)][string]$Url,
    [string]$HtmlPath,
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$sourceUri = [uri]$Url
if ($sourceUri.Scheme -ne 'https' -or $sourceUri.Host -ne 'www.chess.com' -or $sourceUri.AbsolutePath -notmatch '^/(fr/)?lessons/[^/]+/[^/]+/?$') {
    throw 'Indiquez une URL HTTPS de leçon sur www.chess.com.'
}
$lessonSlug = ($sourceUri.AbsolutePath.TrimEnd('/') -split '/')[-1]
$sourceUrl = 'https://www.chess.com/fr/' + ($sourceUri.AbsolutePath.TrimStart('/') -replace '^fr/', '')
if ($HtmlPath) {
    $html = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $HtmlPath).Path)
} else {
    $html = (Invoke-WebRequest -Uri $sourceUrl -UseBasicParsing -Headers @{ 'User-Agent' = 'Mozilla/5.0' }).Content
}
$match = [regex]::Match($html, 'data-lesson\s*=\s*([''"])(.*?)\1', [System.Text.RegularExpressions.RegexOptions]::Singleline)
if (-not $match.Success) {
    throw 'Aucune donnée de leçon accessible dans la page. Import interrompu.'
}
$lesson = [System.Net.WebUtility]::HtmlDecode($match.Groups[2].Value) | ConvertFrom-Json
if (-not $lesson.id -or -not $lesson.questions -or $lesson.questions.Count -eq 0) {
    throw 'La page ne contient pas de questions exploitables.'
}
$exercises = @($lesson.questions | ForEach-Object {
    $pgn = $_
    $fen = [regex]::Match($pgn, '\[FEN "([^"]+)"\]').Groups[1].Value
    if (-not $fen) { throw 'Une question ne contient pas de position FEN.' }
    [ordered]@{
        fen = $fen
        challengeType = [regex]::Match($pgn, '\[LESSON_CHALLENGE_TYPE "([^"]+)"\]').Groups[1].Value
        targets = [regex]::Match($pgn, '\[LESSON_STAR_LOCATIONS "([^"]+)"\]').Groups[1].Value
        comments = @([regex]::Matches($pgn, '\{([^}]*)\}') | ForEach-Object { $_.Groups[1].Value })
        pgn = $pgn
    }
})
$result = [ordered]@{
    schemaVersion = 1
    sourceUrl = $sourceUrl
    capturedAt = [DateTime]::UtcNow.ToString('o')
    title = $lesson.name
    exercises = $exercises
    sourceLesson = $lesson
}
if (-not $OutputPath) {
    $OutputPath = Join-Path (Split-Path $PSScriptRoot -Parent) "data/lessons/$lessonSlug.json"
}
$absoluteOutput = [System.IO.Path]::GetFullPath($OutputPath)
[void][System.IO.Directory]::CreateDirectory((Split-Path $absoluteOutput -Parent))
[System.IO.File]::WriteAllText($absoluteOutput, ($result | ConvertTo-Json -Depth 60), (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Lecon importee : $($lesson.name) ; $($exercises.Count) exercices ; $absoluteOutput"
