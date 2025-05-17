// Utility for development: clear agreements from localStorage and reload
export function clearAgreementsAndReload() {
  localStorage.removeItem('agreements');
  window.location.reload();
}
