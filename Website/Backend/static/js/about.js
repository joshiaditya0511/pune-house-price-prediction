document.addEventListener('DOMContentLoaded', function() {
    const aboutNav = document.getElementById('sidebar-about');
    if (aboutNav) {
      // Add a class that styles the item as "selected"
      aboutNav.classList.add('selected');
    }
  });