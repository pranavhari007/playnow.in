// ─── Global Features ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // 1. Reveal on scroll
    initReveals();

    // 2. Navbar Scroll Effect
    const nav = document.getElementById('navbar');
    if (nav) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) nav.classList.add('scrolled');
            else if (!document.querySelector('.nav-links').classList.contains('active')) {
                // Only remove scrolled if menu is closed
                nav.classList.remove('scrolled');
            }
        });
    }

    // 3. Mobile Navigation Toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            if (nav) nav.classList.add('scrolled'); // keep background when open
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !navToggle.contains(e.target) && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
            }
        });
    }

    // 4. Session Detection (Update Nav)
    updateGlobalNav();
    
    // 5. Initialize Header if container exists
    initHeader();
});

function initHeader() {
    const headerContainer = document.getElementById('navbar-container');
    if (!headerContainer) return;

    const user = JSON.parse(localStorage.getItem('playnow_user') || 'null');
    const isOwner = user && user.role === 'owner';
    const isAdmin = user && user.role === 'admin';
    const isPlayer = user && user.role === 'player';

    const navHTML = `
        <nav id="navbar" class="${window.location.pathname !== '/' && window.location.pathname !== '/index.html' ? 'scrolled' : ''}">
            <div class="container nav-content">
                <a href="index.html" class="logo">PLAY<span>NOW</span></a>
                <button class="nav-toggle">☰</button>
                <div class="nav-links">
                    <a href="index.html">Home</a>
                    <a href="Arenas.html">Arenas</a>
                    ${(isPlayer || isAdmin) ? '<a href="dashboard.html">Dashboard</a>' : ''}
                    ${(isOwner || isAdmin) ? '<a href="owner.html">Owner Portal</a>' : '<a href="owner.html">Become Partner</a>'}
                    <a href="contact.html">Contact</a>
                    ${user ? `
                        <div class="nav-user-info" style="display:flex; align-items:center; gap:12px; margin-left:10px;">
                            <a href="${isAdmin ? 'admin.html' : (isOwner ? 'owner.html' : 'dashboard.html')}" style="color:var(--primary); font-weight:700;">@${user.username || user.name}</a>
                            <button onclick="logout()" class="btn btn-primary" style="padding: 8px 20px; font-size: 0.75rem; border-radius: 50px;">Logout</button>
                        </div>
                    ` : `
                        <a href="auth.html" class="btn btn-outline" style="padding: 10px 24px; font-size: 0.8rem; border-radius: 50px;">Login</a>
                        <a href="Arenas.html" class="btn btn-primary" style="padding: 10px 24px; font-size: 0.8rem; border-radius: 50px;">Book Now</a>
                    `}
                </div>
            </div>
        </nav>
    `;

    headerContainer.innerHTML = navHTML;

    // Re-bind mobile toggle since we just added it to DOM
    const navToggle = headerContainer.querySelector('.nav-toggle');
    const navLinks = headerContainer.querySelector('.nav-links');
    const nav = headerContainer.querySelector('#navbar');
    
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            if (nav) nav.classList.add('scrolled');
        });
    }

    // Scroll effect for the new nav
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) nav.classList.add('scrolled');
        else if (!navLinks.classList.contains('active') && (window.location.pathname === '/' || window.location.pathname === '/index.html')) {
            nav.classList.remove('scrolled');
        }
    });
}

window.logout = function() {
    localStorage.removeItem('playnow_user');
    localStorage.removeItem('playnow_token');
    localStorage.removeItem('playnow_hosted');
    window.location.href = 'index.html';
};

window.initReveals = function() {
    const reveals = document.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, { threshold: 0.1 });

    reveals.forEach(el => observer.observe(el));
};

function updateGlobalNav() {
    const user = JSON.parse(localStorage.getItem('playnow_user') || 'null');
    const authLink = document.getElementById('nav-auth-link');
    const dashboardLink = document.getElementById('nav-dashboard-link');
    const partnerLink = document.getElementById('nav-partner-link');

    if (user && authLink) {
        authLink.textContent = user.username || user.name;
        authLink.href = user.role === 'owner' ? 'owner.html' : user.role === 'admin' ? 'admin.html' : 'dashboard.html';
        
        // Hide/Show relevant links
        if (dashboardLink) dashboardLink.style.display = (user.role === 'player' || user.role === 'admin') ? 'block' : 'none';
        if (partnerLink) partnerLink.style.display = (user.role === 'owner' || user.role === 'admin') ? 'block' : 'none';
    }
}

// ─── Smooth scroll for anchor links ──────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ─── Nav: show username if logged in ─────────────────────────
try {
    const user = JSON.parse(localStorage.getItem('playnow_user') || 'null');
    const authLink = document.getElementById('nav-auth-link');
    if (user && authLink) {
        authLink.textContent = '@' + (user.username || user.name || 'Profile');
        authLink.href = 'dashboard.html';
        authLink.style.color = 'var(--primary)';
    }
} catch(e) {}
