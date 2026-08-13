$files = Get-ChildItem -Path "C:\Users\Aveva\.gemini\antigravity\scratch\teachforchange-weekly\*.html"
foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $newContent = $content -replace "⚙️ Setup &amp; Directory", "Dashboard" `
                           -replace "⚙️ Setup & Directory", "Dashboard" `
                           -replace "⚙️ Registry &amp; Year Plan", "Dashboard" `
                           -replace "⚙️ Registry & Year Plan", "Dashboard"
    if ($content -ne $newContent) {
        [System.IO.File]::WriteAllText($f.FullName, $newContent, [System.Text.Encoding]::UTF8)
        Write-Host "Updated $($f.Name)"
    }
}
Write-Host "Done"
