document.addEventListener('DOMContentLoaded', function() {
    const recommenderNav = document.getElementById('sidebar-recommender');
    if (recommenderNav) {
      // Add a class that styles the item as "selected"
      recommenderNav.classList.add('selected');
    }
  });