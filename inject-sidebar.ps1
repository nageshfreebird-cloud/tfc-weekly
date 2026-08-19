$files = Get-ChildItem -Filter *.html

foreach ($file in $files) {
    if ($file.Name -eq "index.html" -or $file.Name -eq "login.html") { continue }
    
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # 1. Add menu-toggle to navbar-brand if not already there
    if ($content -notmatch 'menu-toggle') {
        $content = $content -replace '<div class="navbar-brand">\s*<img', '<div class="navbar-brand">`r`n    <button class="menu-toggle" onclick="toggleSidebar()">☰</button>`r`n    <img'
    }

    # 2. Extract existing nav-tabs <a> links
    if ($content -match '(?s)<div class="nav-tabs"[^>]*>(.*?)</div>') {
        $links = $matches[1]
        
        $sidebarHtml = @"
    <!-- Sidebar Navigation -->
    <div class="sidebar-overlay" id="sidebar-overlay" onclick="toggleSidebar()"></div>
    <div class="sidebar" id="sidebar">
      <button class="sidebar-close" onclick="toggleSidebar()">&times;</button>
      <div class="sidebar-header">
        <img src="logo.png" alt="Logo" />
        <h2>Teach for Change</h2>
      </div>
      <div class="sidebar-nav">
$links
      </div>
    </div>
"@

        $content = $content -replace '(?s)<!-- Navigation Tabs -->.*?<div class="nav-tabs"[^>]*>.*?</div>', $sidebarHtml
        $content = $content -replace '(?s)<div class="nav-tabs"[^>]*>.*?</div>', $sidebarHtml
    }

    # 3. Add toggleSidebar function if not present
    if ($content -notmatch 'function toggleSidebar') {
        $scriptBlock = @"
<script>
  window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if(sidebar) sidebar.classList.toggle('active');
    if(overlay) overlay.classList.toggle('active');
  };
</script>
</body>
"@
        $content = $content -replace '</body>', $scriptBlock
    }

    Set-Content $file.FullName -Value $content -Encoding UTF8
    Write-Host "Injected Sidebar into $($file.Name)"
}
