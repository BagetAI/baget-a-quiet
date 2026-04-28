document.addEventListener('DOMContentLoaded', () => {
    const MEMBERS_DB_ID = '18691c35-2f50-423d-9b88-a807ee03318e';
    const INVENTORY_DB_ID = '8ebb9b16-e8d3-4a8a-ab31-687a946f659c';

    const loginForm = document.getElementById('login-form');
    const authGate = document.getElementById('auth-gate');
    const portalContent = document.getElementById('portal-content');
    const authError = document.getElementById('auth-error');
    
    const memberName = document.getElementById('member-name');
    const memberTierDisplay = document.getElementById('member-tier-display');
    const memberTierLabel = document.getElementById('member-tier-label');
    const memberJoined = document.getElementById('member-joined');
    const exclusiveInventory = document.getElementById('exclusive-inventory');

    // Check for existing session
    const savedToken = localStorage.getItem('aq_member_token');
    if (savedToken) {
        verifyToken(savedToken);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = document.getElementById('member-token').value.trim();
            verifyToken(token);
        });
    }

    async function verifyToken(token) {
        const submitBtn = loginForm ? loginForm.querySelector('button') : null;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Verifying...';
        }

        try {
            const response = await fetch(`https://app.baget.ai/api/public/databases/${MEMBERS_DB_ID}/rows`);
            const members = await response.json();
            
            const member = members.find(m => m.token === token);

            if (member) {
                // Success
                localStorage.setItem('aq_member_token', token);
                showPortal(member);
            } else {
                // Fail
                if (authError) authError.textContent = 'Invalid token. Please check your invitation email.';
                localStorage.removeItem('aq_member_token');
            }
        } catch (error) {
            console.error('Auth error:', error);
            if (authError) authError.textContent = 'System offline. Please try again later.';
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Verify Identity';
            }
        }
    }

    function showPortal(member) {
        if (authGate) authGate.style.display = 'none';
        if (portalContent) portalContent.style.display = 'block';
        
        if (memberName) memberName.textContent = member.name;
        if (memberTierDisplay) memberTierDisplay.textContent = `${member.tier} Member`;
        if (memberTierLabel) memberTierLabel.textContent = member.tier;
        if (memberJoined) memberJoined.textContent = formatDate(member.joined_date);

        fetchExclusiveInventory();
    }

    async function fetchExclusiveInventory() {
        try {
            const response = await fetch(`https://app.baget.ai/api/public/databases/${INVENTORY_DB_ID}/rows`);
            const data = await response.json();
            
            // Sort by price high to low for "exclusive" feel
            const records = data.sort((a, b) => b.Price - a.Price).slice(0, 8);
            
            if (exclusiveInventory) {
                exclusiveInventory.innerHTML = records.map(record => `
                    <div class="record-card">
                        <div class="record-info">
                            <h3 class="record-artist">${record.Artist}</h3>
                            <p class="record-album">${record['Album Title']}</p>
                            <div class="record-meta">
                                <span>${record.Genre}</span>
                                <span>Exclusive Preview</span>
                            </div>
                        </div>
                        <div>
                            <p class="record-price">${record.Price} ILS</p>
                            <button class="notify-btn" onclick="alert('Exclusive reservation sent to Jeff.')">
                                Reserve Pressing
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'April 2026';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
});
