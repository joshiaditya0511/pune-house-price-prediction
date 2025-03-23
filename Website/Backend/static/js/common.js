// static/js/common.js

function notificationStrip () {
  var notificationStrip = document.getElementById('notification-strip');
  var closeNotificationBtn = document.getElementById('close-notification');
  var navbar = document.querySelector('.navbar');

  // Check if the notification has been closed before
  if (sessionStorage.getItem('notificationClosed')) {
    notificationStrip.style.display = 'none';
    document.body.classList.remove('notification-visible');
  } else {
    // Add class to adjust navbar position
    document.body.classList.add('notification-visible');
  }

  closeNotificationBtn.addEventListener('click', function() {
    notificationStrip.style.display = 'none';
    document.body.classList.remove('notification-visible');
    sessionStorage.setItem('notificationClosed', 'true');
  });
};

document.addEventListener('DOMContentLoaded', function() {

  notificationStrip();

  const sidebar = document.getElementById('sidebar');
  const tray = document.getElementById('sidebar-tray');
  const trayIcon = document.querySelector('.tray-icon');

  // Toggle on tray icon click
  if (tray) {
    tray.addEventListener('click', function() {
      sidebar.classList.toggle('collapsed');
      sidebar.classList.toggle('expanded');
      // Change the tray icon
      if (sidebar.classList.contains('collapsed')) {
        trayIcon.classList.remove('bi-chevron-left');
        trayIcon.classList.add('bi-chevron-right');
      } else {
        trayIcon.classList.remove('bi-chevron-right');
        trayIcon.classList.add('bi-chevron-left');
      }
    });
  }

  // // If you want the sidebar to auto-collapse on mouse leave:
  // sidebar.addEventListener('mouseleave', function() {
  //   // Only collapse if it's currently expanded:
  //   if (!sidebar.classList.contains('collapsed')) {
  //     sidebar.classList.add('collapsed');
  //     trayIcon.classList.remove('bi-chevron-left');
  //     trayIcon.classList.add('bi-chevron-right');
  //   }
  // });

  // // If you want the sidebar to auto-expand on mouse enter:
  // sidebar.addEventListener('mouseenter', function() {
  //   // Only expand if it's currently collapsed:
  //   if (sidebar.classList.contains('collapsed')) {
  //     sidebar.classList.remove('collapsed');
  //     trayIcon.classList.remove('bi-chevron-right');
  //     trayIcon.classList.add('bi-chevron-left');
  //   }
  // });

  // sidebar.addEventListener('mouseenter', () => {
  //   if (sidebar.classList.contains('collapsed')) {
  //     sidebar.classList.remove('collapsed');
  //     sidebar.classList.add('expanded');
  //     trayIcon.classList.remove('bi-chevron-right');
  //     trayIcon.classList.add('bi-chevron-left');
  //   }
  // });
  // sidebar.addEventListener('mouseleave', () => {
  //   if (sidebar.classList.contains('expanded')) {
  //     sidebar.classList.remove('expanded');
  //     sidebar.classList.add('collapsed');
  //     trayIcon.classList.remove('bi-chevron-left');
  //     trayIcon.classList.add('bi-chevron-right');
  //   }
  // });
  

});
