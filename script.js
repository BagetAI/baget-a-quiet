document.addEventListener('DOMContentLoaded', () => {
    // Database IDs
    const INVENTORY_DB_ID = '8ebb9b16-e8d3-4a8a-ab31-687a946f659c';
    const WAITLIST_DB_ID = 'e4f15751-13fd-418b-a52b-2d5198da933f';

    const recordGallery = document.getElementById('record-gallery');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const signupForm = document.getElementById('signup-form');
    const notifyForm = document.getElementById('notify-form');
    const modal = document.getElementById('notify-modal');
    const closeModal = document.getElementById('close-modal');
    const modalTitle = document.getElementById('modal-record-title');
    const interestInput = document.getElementById('record-interest');
    const totalInterestEl = document.getElementById('total-interest');

    let allRecords = [];

    // --- Inventory Logic ---
    async function fetchInventory() {
        try {
            const response = await fetch(`https://baget.ai/api/public/databases/${INVENTORY_DB_ID}/rows`);
            const data = await response.json();
            allRecords = data;
            renderRecords(allRecords);
        } catch (error) {
            console.error('Error fetching inventory:', error);
            if (recordGallery) {
                recordGallery.innerHTML = '<div class="error-state">Archive currently unavailable. Please visit us in person.</div>';
            }
        }
    }

    function renderRecords(records) {
        if (!recordGallery) return;
        
        if (records.length === 0) {
            recordGallery.innerHTML = '<div class="empty-state">No matching selections found.</div>';
            return;
        }

        recordGallery.innerHTML = records.map(record => `
            <div class="record-card" data-genre="${record.Genre}">
                <div class="record-info">
                    <h3 class="record-artist">${record.Artist}</h3>
                    <p class="record-album">${record['Album Title']}</p>
                    <div class="record-meta">
                        <span>${record.Genre}</span>
                        <span>${record.Condition || 'Mint'}</span>
                        <span>${record['Stock Level'] > 0 ? 'In Stock' : 'On Order'}</span>
                    </div>
                </div>
                <div>
                    <p class="record-price">${record.Price} ILS</p>
                    <button class="notify-btn" data-record="${record.Artist} - ${record['Album Title']}">
                        ${record['Stock Level'] > 0 ? 'Reserve Copy' : 'Notify When Back'}
                    </button>
                </div>
            </div>
        `).join('');

        // Attach listeners to new buttons
        document.querySelectorAll('.notify-btn').forEach(btn => {
            btn.addEventListener('click', () => openNotifyModal(btn.dataset.record));
        });
    }

    // --- Community Stats Logic ---
    async function fetchWaitlistStats() {
        try {
            const response = await fetch(`https://baget.ai/api/public/databases/${WAITLIST_DB_ID}/rows`);
            const data = await response.json();
            // We have 178 baseline prospects from outreach + new signups
            const total = 178 + (data.length || 0);
            if (totalInterestEl) {
                totalInterestEl.textContent = total;
            }
        } catch (error) {
            console.error('Error fetching waitlist stats:', error);
        }
    }

    // --- Filtering Logic ---
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.dataset.filter;
            const filtered = filter === 'all' 
                ? allRecords 
                : allRecords.filter(r => r.Genre && r.Genre.toLowerCase().includes(filter.toLowerCase()));
            
            renderRecords(filtered);
        });
    });

    // --- Modal Logic ---
    function openNotifyModal(recordTitle) {
        modalTitle.textContent = recordTitle;
        interestInput.value = recordTitle;
        modal.classList.add('active');
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => modal.classList.remove('active'));
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    // --- Form Submission Logic ---
    async function handleSubmission(form, dbId, messageElement, successMsg) {
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => data[key] = value);
        data.signup_date = new Date().toISOString();

        const submitBtn = form.querySelector('button');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        try {
            const response = await fetch(`https://baget.ai/api/public/databases/${dbId}/rows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data })
            });

            if (response.ok) {
                messageElement.textContent = successMsg;
                messageElement.className = 'form-message success';
                form.reset();
                if (form.id === 'notify-form') {
                    setTimeout(() => modal.classList.remove('active'), 2000);
                }
                // Refresh stats
                fetchWaitlistStats();
            } else {
                throw new Error('Submission failed');
            }
        } catch (error) {
            messageElement.textContent = 'The sanctuary is busy. Try again soon.';
            messageElement.className = 'form-message error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const msg = document.getElementById('form-message');
            handleSubmission(signupForm, WAITLIST_DB_ID, msg, 'Invitation requested. Check your inbox.');
        });
    }

    if (notifyForm) {
        notifyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const msg = document.getElementById('notify-message');
            handleSubmission(notifyForm, WAITLIST_DB_ID, msg, 'Notification set. We will contact you.');
        });
    }

    // Init
    fetchInventory();
    fetchWaitlistStats();
});
