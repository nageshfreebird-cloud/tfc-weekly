// Global UI Utilities (Shadcn + SweetAlert2)

window.showToast = function(msg, type='info') {
    if (typeof Swal === 'undefined') {
        alert(msg);
        return;
    }
    Swal.fire({
        toast: true,
        position: 'bottom-right',
        icon: type === 'success' || type === 'error' ? type : 'info',
        title: msg,
        showConfirmButton: false,
        timer: 3000,
        customClass: {
            popup: 'shadcn-toast'
        }
    });
};

window.modernConfirm = async function(msg, confirmText='Continue', danger=false) {
    if (typeof Swal === 'undefined') return confirm(msg);
    
    const res = await Swal.fire({
        title: 'Are you sure?',
        text: msg,
        icon: danger ? 'warning' : 'question',
        showCancelButton: true,
        confirmButtonColor: danger ? 'var(--danger)' : 'var(--primary)',
        cancelButtonColor: 'transparent',
        confirmButtonText: confirmText,
        cancelButtonText: '<span style="color:var(--foreground)">Cancel</span>',
        customClass: {
            cancelButton: 'btn-outline'
        }
    });
    return res.isConfirmed;
};


document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.vol-table, .table').forEach(table => {
        const headers = table.querySelectorAll('th');
        headers.forEach((th, i) => {
            if (th.textContent.trim() === '' || th.querySelector('button') || th.innerText.includes('Action')) return;
            
            th.style.cursor = 'pointer';
            th.title = "Click to sort";
            th.addEventListener('click', () => {
                const tbody = table.querySelector('tbody');
                if(!tbody) return;
                
                const rows = Array.from(tbody.querySelectorAll('tr'));
                const isAsc = th.classList.contains('sort-asc');
                
                // Clear all other sorts
                headers.forEach(h => {
                    h.classList.remove('sort-asc', 'sort-desc');
                    h.innerHTML = h.innerHTML.replace(' ?', '').replace(' ?', '');
                });
                
                const dirModifier = isAsc ? -1 : 1;
                th.classList.toggle('sort-asc', !isAsc);
                th.classList.toggle('sort-desc', isAsc);
                th.innerHTML += isAsc ? ' ?' : ' ?';
                
                rows.sort((a, b) => {
                    const aCol = a.querySelector(`td:nth-child(${i + 1})`);
                    const bCol = b.querySelector(`td:nth-child(${i + 1})`);
                    if(!aCol || !bCol) return 0;
                    
                    const aText = aCol.textContent.trim();
                    const bText = bCol.textContent.trim();
                    
                    const aNum = parseFloat(aText);
                    const bNum = parseFloat(bText);
                    
                    if(!isNaN(aNum) && !isNaN(bNum)) {
                        return (aNum - bNum) * dirModifier;
                    }
                    return aText.localeCompare(bText) * dirModifier;
                });
                
                tbody.innerHTML = '';
                rows.forEach(r => tbody.appendChild(r));
            });
        });
    });
});

function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.getAttribute('data-count'));
    if(isNaN(target)) return;
    
    if (el._countTimer) clearInterval(el._countTimer);
    
    if (target === 0) {
      el.textContent = 0;
      el.classList.add('stat-counted');
      return;
    }

    let current = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    el._countTimer = setInterval(() => {
      current += step;
      if(current >= target) { 
        current = target; 
        clearInterval(el._countTimer); 
        el.classList.add('stat-counted'); 
      }
      el.textContent = current;
    }, 30);
  });
}
window.animateCounters = animateCounters;

function initTheme() {
  const saved = localStorage.getItem('tfc-theme');
  if(saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
}
window.toggleTheme = function() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if(isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('tfc-theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('tfc-theme', 'dark');
  }
};
initTheme();

let langData = null;
async function loadLang() {
  if(langData) return langData;
  try {
    const res = await fetch('./js/lang.json');
    langData = await res.json();
  } catch(e) { langData = {}; }
  return langData;
}
window.switchLang = async function(code) {
  const data = await loadLang();
  const t = data[code];
  if(!t) return;
  localStorage.setItem('tfc-lang', code);
  document.querySelectorAll('[data-lang]').forEach(el => {
    const key = el.getAttribute('data-lang');
    if(t[key]) el.textContent = t[key];
  });
};
(function() {
  const saved = localStorage.getItem('tfc-lang');
  if(saved && saved !== 'en') {
    window.addEventListener('DOMContentLoaded', () => window.switchLang(saved));
  }
})();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

window.addScanLine = function() {
  const cam = document.getElementById('camera-modal');
  if(cam && !cam.querySelector('.scan-line')) {
    const container = cam.querySelector('div[style*="position:relative"]');
    if(container) {
      const line = document.createElement('div');
      line.className = 'scan-line';
      container.appendChild(line);
    }
  }
};
window.removeScanLine = function() {
  document.querySelectorAll('.scan-line').forEach(el => el.remove());
};
