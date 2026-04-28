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
    const interestInput = document.getElementById('record_interest');
    const totalInterestEl = document.getElementById('total-interest');

    let allRecords = [];

    // --- Inventory Logic ---
    async function fetchInventory() {
        try {
            const response = await fetch(`https://baget.ai/api/public/databases/${INVENTORY_DB_ID}/rows`);
            if (!response.ok) throw new Error('Inventory fetch failed');
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
                    <h3 class="record-artist">${record.Artist || 'Unknown Artist'}</h3>
                    <p class="record-album">${record['Album Title'] || 'Unknown Album'}</p>
                    <div class="record-meta">
                        <span>${record.Genre || 'Jazz'}</span>
                        <span>${record.Condition || 'Mint'}</span>
                        <span>${(record['Stock Level'] > 0 || record.stock_level > 0) ? 'In Stock' : 'On Order'}</span>
                    </div>
                </div>
                <div>
                    <p class="record-price">${record.Price || record.price || '---'} ILS</p>
                    <button class="notify-btn" data-record="${record.Artist} - ${record['Album Title']}">
                        ${(record['Stock Level'] > 0 || record.stock_level > 0) ? 'Reserve Copy' : 'Notify When Back'}
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
            if (!response.ok) throw new Error('Stats fetch failed');
            const data = await response.json();
            // We have 178 baseline prospects from outreach + new signups
            const total = 178 + (Array.isArray(data) ? data.length : 0);
            animateValue(totalInterestEl, parseInt(totalInterestEl.textContent) || 178, total, 1000);
        } catch (error) {
            console.error('Error fetching waitlist stats:', error);
        }
    }

    function animateValue(obj, start, end, duration) {
        if (!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // --- Filtering Logic ---
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.dataset.filter;
            const filtered = filter === 'all' 
                ? allRecords 
                : allRecords.filter(r => {
                    const genre = r.Genre || r.genre || '';
                    return genre.toLowerCase().includes(filter.toLowerCase());
                });
            
            renderRecords(filtered);
        });
    });

    // --- Modal Logic ---
    function openNotifyModal(recordTitle) {
        if (!modal) return;
        modalTitle.textContent = recordTitle;
        if (interestInput) interestInput.value = recordTitle;
        modal.classList.add('active');
        
        // Clear previous messages
        const msg = document.getElementById('notify-message');
        if (msg) {
            msg.textContent = '';
            msg.className = 'form-message';
        }
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
        formData.forEach((value, key) => {
            if (value && value !== "") {
                data[key] = value;
            }
        });
        
        // Ensure name is never empty for database compatibility
        if (!data.name && form.id === 'notify-form') {
            data.name = 'Notification Request';
        }
        
        data.signup_date = new Date().toISOString();

        const submitBtn = form.querySelector('button');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        console.log(`Submitting to ${dbId}:`, data);

        try {
            const response = await fetch(`https://baget.ai/api/public/databases/${dbId}/rows`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ data })
            });

            const result = await response.json().catch(() => ({ error: 'Invalid JSON response' }));

            if (response.ok) {
                messageElement.textContent = successMsg;
                messageElement.className = 'form-message success';
                messageElement.style.color = (form.id === 'signup-form') ? 'var(--accent)' : 'var(--deep-walnut)';
                form.reset();
                
                if (form.id === 'notify-form') {
                    setTimeout(() => modal.classList.remove('active'), 2500);
                }
                
                // Refresh stats
                fetchWaitlistStats();
            } else {
                console.error('API Error:', result);
                throw new Error(result.error || 'Submission failed');
            }
        } catch (error) {
            console.error('Submission error:', error);
            messageElement.textContent = 'The sanctuary is busy. Try again soon.';
            messageElement.className = 'form-message error';
            messageElement.style.color = '#e74c3c';
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
