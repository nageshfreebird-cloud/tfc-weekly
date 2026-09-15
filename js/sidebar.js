// Shared Sidebar Component - highlights active page
(function() {
  var page = window.location.pathname.split('/').pop() || 'index.html';
  document.addEventListener('DOMContentLoaded', function() {
    var links = document.querySelectorAll('.sidebar-nav a');
    links.forEach(function(link) {
      var href = link.getAttribute('href');
      if(href && (href === page || (page === '' && href === 'index.html'))) {
        link.classList.add('active');
      }
    });
  });
})();
