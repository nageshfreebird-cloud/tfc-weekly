$files = Get-ChildItem -Path "C:\Users\Aveva\.gemini\antigravity\scratch\teachforchange-weekly\*.html"
foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName)
    $newContent = $content -replace ">⚙️ Registry &amp; Year Plan<", ">Dashboard<" `
                           -replace ">⚙️ Registry & Year Plan<", ">Dashboard<" `
                           -replace ">📈 Overall Summary<", ">Dashboard<"
    if ($content -ne $newContent) {
        [System.IO.File]::WriteAllText($f.FullName, $newContent, [System.Text.Encoding]::UTF8)
        Write-Host "Updated $($f.Name)"
    }
}
Write-Host "Done"
