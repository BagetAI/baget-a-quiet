document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('signup-form');
    const message = document.getElementById('form-message');
    const dbId = 'e4f15751-13fd-418b-a52b-2d5198da933f';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = {
            email: formData.get('email'),
            name: formData.get('name'),
            signup_date: new Date().toISOString().split('T')[0]
        };

        const submitBtn = form.querySelector('button');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        try {
            const response = await fetch(`https://baget.ai/api/public/databases/${dbId}/rows`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ data }),
            });

            if (response.ok) {
                message.textContent = 'Welcome to the circle. We will be in touch.';
                message.className = 'form-message success';
                form.reset();
            } else {
                throw new Error('Failed to submit');
            }
        } catch (error) {
            console.error('Submission error:', error);
            message.textContent = 'An error occurred. Please try again.';
            message.className = 'form-message error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });
});
