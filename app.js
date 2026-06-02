/**
 * TextPresent - Premium Text Presentation Studio
 * Core Client-Side Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Inputs & Controls
    const textInput = document.getElementById('text-input');
    const charCount = document.getElementById('char-count');
    const fontFamilySelect = document.getElementById('font-family-select');
    const fontSizeSlider = document.getElementById('font-size-slider');
    const fontSizeVal = document.getElementById('font-size-val');
    const lineHeightSlider = document.getElementById('line-height-slider');
    const lineHeightVal = document.getElementById('line-height-val');
    const letterSpacingSlider = document.getElementById('letter-spacing-slider');
    const letterSpacingVal = document.getElementById('letter-spacing-val');
    const alignBtns = document.querySelectorAll('.align-btn');
    const themeBtns = document.querySelectorAll('.theme-btn');
    const glassBlurSlider = document.getElementById('glass-blur-slider');
    const glassBlurVal = document.getElementById('glass-blur-val');
    const glassIntensityGroup = document.querySelector('.glass-intensity-group');
    const animationSelect = document.getElementById('animation-select');
    const ambientParticlesCheck = document.getElementById('ambient-particles-check');

    // DOM Elements - Outputs & Actions
    const renderedText = document.getElementById('rendered-text');
    const presentationCard = document.getElementById('presentation-card');
    const cardTagVal = document.getElementById('card-tag-val');
    const cardAuthorVal = document.getElementById('card-author-val');
    const cardDateVal = document.getElementById('card-date-val');
    const particlesContainer = document.getElementById('particles-container');
    const sidebarPanel = document.getElementById('sidebar-panel');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const exportPngBtn = document.getElementById('export-png-btn');
    const copyTextBtn = document.getElementById('copy-text-btn');
    const floatingTips = document.querySelector('.floating-tips');
    const presetBtns = document.querySelectorAll('.suggestion-btn');

    // Inspirational Presets Database
    const presets = {
        quote: {
            text: "「與其去尋找一個能讓你停泊的港口，\n不如讓自己成為能抵禦一切風浪的風暴。」\n\n熱情是前進的燃料，也是燃燒自我的火焰。\n在追求極致的道路上，我們終將與真實的自己相遇。",
            tag: "INSIGHT & LIFE",
            author: "— 永恆的追尋者",
            font: "'Noto Serif TC', serif",
            size: 32,
            lineHeight: 1.8,
            letterSpacing: 2,
            align: "center",
            theme: "glass"
        },
        poem: {
            text: "落霞與孤鶩齊飛，秋水共長天一色。\n漁舟唱晚，響窮彭蠡之濱；\n雁陣驚寒，聲斷衡陽之浦。",
            tag: "CLASSICAL LITERATURE",
            author: "— 王勃《滕王閣序》",
            font: "'Noto Serif TC', serif",
            size: 36,
            lineHeight: 2.0,
            letterSpacing: 4,
            align: "center",
            theme: "sunset"
        },
        code: {
            text: "const developer = {\n    name: 'Antigravity',\n    passion: ['Coding', 'Design', 'Aesthetics'],\n    createPremiumUI: function() {\n        return this.passion.map(skill => \n            `Weaving ${skill} into digital art...`\n        );\n    }\n};\nconsole.log(developer.createPremiumUI());",
            tag: "CREATIVE CODING",
            author: "— js_aesthetic_studio.js",
            font: "'Fira Code', monospace",
            size: 20,
            lineHeight: 1.5,
            letterSpacing: 0,
            align: "left",
            theme: "cyber"
        },
        minimal: {
            text: "Simplicity is the ultimate sophistication.\nLess is always more.",
            tag: "MINIMAL DESIGN",
            author: "— Leonardo da Vinci",
            font: "'Playfair Display', serif",
            size: 40,
            lineHeight: 1.6,
            letterSpacing: 1,
            align: "center",
            theme: "nordic"
        }
    };

    // State
    let currentAlign = 'center';
    let currentTheme = 'glass';
    let currentAnimationClass = 'anim-fade-in';

    // Set Initial Date
    const today = new Date();
    const formattedDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    cardDateVal.textContent = formattedDate;

    // Load default preset on startup
    applyPreset('quote');

    // Real-time Text Input Synchronization
    textInput.addEventListener('input', () => {
        const text = textInput.value;
        renderedText.textContent = text || "這裡將以極致的視覺排版呈現您的文字。";
        charCount.textContent = text.length;
        triggerAnimation();
    });

    // Font Family Selector
    fontFamilySelect.addEventListener('change', () => {
        renderedText.style.fontFamily = fontFamilySelect.value;
    });

    // Font Size Slider
    fontSizeSlider.addEventListener('input', () => {
        const val = fontSizeSlider.value;
        fontSizeVal.textContent = `${val}px`;
        renderedText.style.fontSize = `${val}px`;
    });

    // Line Height Slider
    lineHeightSlider.addEventListener('input', () => {
        const val = lineHeightSlider.value;
        lineHeightVal.textContent = val;
        renderedText.style.lineHeight = val;
    });

    // Letter Spacing Slider
    letterSpacingSlider.addEventListener('input', () => {
        const val = letterSpacingSlider.value;
        letterSpacingVal.textContent = `${val}px`;
        renderedText.style.letterSpacing = `${val}px`;
    });

    // Text Alignment Click Handlers
    alignBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            alignBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentAlign = btn.dataset.align;
            renderedText.style.textAlign = currentAlign;
        });
    });

    // Theme Selection Click Handlers
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const selectedTheme = btn.dataset.theme;
            applyTheme(selectedTheme);
        });
    });

    // Glass Blur Intensity Slider
    glassBlurSlider.addEventListener('input', () => {
        const val = glassBlurSlider.value;
        glassBlurVal.textContent = `${val}px`;
        if (currentTheme === 'glass') {
            presentationCard.style.backdropFilter = `blur(${val}px)`;
            presentationCard.style.webkitBackdropFilter = `blur(${val}px)`;
        }
    });

    // Animation Style Selector
    animationSelect.addEventListener('change', () => {
        const nextAnim = animationSelect.value;
        renderedText.classList.remove(currentAnimationClass);
        if (nextAnim !== 'anim-none') {
            currentAnimationClass = nextAnim;
            renderedText.classList.add(currentAnimationClass);
            triggerAnimation();
        } else {
            currentAnimationClass = 'anim-none';
        }
    });

    // Ambient Particles Control
    ambientParticlesCheck.addEventListener('change', () => {
        if (ambientParticlesCheck.checked) {
            generateParticles();
        } else {
            clearParticles();
        }
    });

    // Floating Sidebar Toggle Button Action
    toggleSidebarBtn.addEventListener('click', () => {
        sidebarPanel.classList.toggle('collapsed');
        const isCollapsed = sidebarPanel.classList.contains('collapsed');
        toggleSidebarBtn.innerHTML = isCollapsed ? '<i class="fa-solid fa-gears"></i>' : '<i class="fa-solid fa-bars-staggered"></i>';
    });

    // Preset Button Click Handlers
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const presetKey = btn.dataset.preset;
            applyPreset(presetKey);
        });
    });

    // Fullscreen Presentation Mode Actions
    fullscreenBtn.addEventListener('click', () => {
        toggleFullscreen();
    });

    // Keyboard ESC to exit Fullscreen Mode
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('fullscreen-mode')) {
            exitFullscreenMode();
        }
    });

    // Copy Current Text to Clipboard
    copyTextBtn.addEventListener('click', () => {
        const textToCopy = textInput.value;
        if (!textToCopy) {
            showToast("請輸入一些文字以進行複製！", "warning");
            return;
        }

        navigator.clipboard.writeText(textToCopy)
            .then(() => showToast("文字已成功複製至剪貼簿！", "success"))
            .catch(() => showToast("複製失敗，請手動複製。", "error"));
    });

    // Export PNG Image using html2canvas
    exportPngBtn.addEventListener('click', () => {
        if (!textInput.value.trim()) {
            showToast("請先輸入展示文字，再導出卡片！", "warning");
            return;
        }

        exportPngBtn.disabled = true;
        exportPngBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> 正在生成畫布...';

        // Brief delay to ensure smooth rendering context
        setTimeout(() => {
            // Apply high scale for high resolution output
            const opt = {
                scale: 3, 
                backgroundColor: null,
                useCORS: true,
                logging: false,
                allowTaint: true
            };

            html2canvas(presentationCard, opt).then(canvas => {
                const link = document.createElement('a');
                link.download = `TextPresent_${formattedDate}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();

                // Restore button state
                exportPngBtn.disabled = false;
                exportPngBtn.innerHTML = '<i class="fa-solid fa-download"></i> 導出精美卡片';
                showToast("卡片已成功生成並下載！", "success");
            }).catch(err => {
                console.error("html2canvas export error:", err);
                exportPngBtn.disabled = false;
                exportPngBtn.innerHTML = '<i class="fa-solid fa-download"></i> 導出精美卡片';
                showToast("導出失敗，請重試或更換瀏覽器。", "error");
            });
        }, 300);
    });

    /* ==========================================
       Helper Functions
       ========================================== */

    // Re-trigger text animations
    function triggerAnimation() {
        if (currentAnimationClass === 'anim-none') return;
        renderedText.classList.remove(currentAnimationClass);
        // Force reflow
        void renderedText.offsetWidth;
        renderedText.classList.add(currentAnimationClass);
    }

    // Apply Styles and Content from presets database
    function applyPreset(key) {
        const data = presets[key];
        if (!data) return;

        // Content
        textInput.value = data.text;
        renderedText.textContent = data.text;
        charCount.textContent = data.text.length;
        cardTagVal.textContent = data.tag;
        cardAuthorVal.textContent = data.author;

        // Typography Settings
        fontFamilySelect.value = data.font;
        renderedText.style.fontFamily = data.font;

        fontSizeSlider.value = data.size;
        fontSizeVal.textContent = `${data.size}px`;
        renderedText.style.fontSize = `${data.size}px`;

        lineHeightSlider.value = data.lineHeight;
        lineHeightVal.textContent = data.lineHeight;
        renderedText.style.lineHeight = data.lineHeight;

        letterSpacingSlider.value = data.letterSpacing;
        letterSpacingVal.textContent = `${data.letterSpacing}px`;
        renderedText.style.letterSpacing = `${data.letterSpacing}px`;

        // Align
        currentAlign = data.align;
        renderedText.style.textAlign = data.align;
        alignBtns.forEach(btn => {
            if (btn.dataset.align === data.align) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Theme
        applyTheme(data.theme);
        themeBtns.forEach(btn => {
            if (btn.dataset.theme === data.theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        triggerAnimation();
    }

    // Apply selected Theme Classes and resets custom overrides if applicable
    function applyTheme(themeName) {
        // Remove all previous theme classes
        presentationCard.classList.remove(
            'theme-glass', 'theme-sunset', 'theme-neon', 
            'theme-nordic', 'theme-editorial', 'theme-cyber'
        );
        
        currentTheme = themeName;
        presentationCard.classList.add(`theme-${themeName}`);

        // Handle specific styles overlays
        if (themeName === 'glass') {
            glassIntensityGroup.style.display = 'flex';
            const blurVal = glassBlurSlider.value;
            presentationCard.style.backdropFilter = `blur(${blurVal}px)`;
            presentationCard.style.webkitBackdropFilter = `blur(${blurVal}px)`;
        } else {
            glassIntensityGroup.style.display = 'none';
            presentationCard.style.backdropFilter = 'none';
            presentationCard.style.webkitBackdropFilter = 'none';
        }
    }

    // Fullscreen Functionality
    function toggleFullscreen() {
        if (!document.body.classList.contains('fullscreen-mode')) {
            enterFullscreenMode();
        } else {
            exitFullscreenMode();
        }
    }

    function enterFullscreenMode() {
        document.body.classList.add('fullscreen-mode');
        fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i> 退出全螢幕';
        floatingTips.classList.add('visible');

        // Request browser Native Fullscreen if supported
        const workspace = document.documentElement;
        if (workspace.requestFullscreen) {
            workspace.requestFullscreen().catch(() => {});
        } else if (workspace.webkitRequestFullscreen) {
            workspace.webkitRequestFullscreen();
        }

        // Auto show float toast for assistance
        setTimeout(() => {
            floatingTips.classList.remove('visible');
        }, 4000);
    }

    function exitFullscreenMode() {
        document.body.classList.remove('fullscreen-mode');
        fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i> 全螢幕';
        floatingTips.classList.remove('visible');

        // Exit browser Native Fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }

    // Detect native browser fullscreen changes (e.g. user pressed F11 or Esc natively)
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            document.body.classList.remove('fullscreen-mode');
            fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i> 全螢幕';
            floatingTips.classList.remove('visible');
        }
    });

    // Particle Background Generation
    function generateParticles() {
        clearParticles();
        const density = window.innerWidth < 768 ? 15 : 30;
        
        for (let i = 0; i < density; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            
            // Random properties
            const size = Math.random() * 250 + 80;
            const top = Math.random() * 100;
            const left = Math.random() * 100;
            const delay = Math.random() * -15; // Negative delay to start immediately
            const duration = Math.random() * 10 + 10;
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.top = `${top}%`;
            particle.style.left = `${left}%`;
            particle.style.animationDelay = `${delay}s`;
            particle.style.animationDuration = `${duration}s`;
            
            particlesContainer.appendChild(particle);
        }
    }

    function clearParticles() {
        particlesContainer.innerHTML = '';
    }

    // Initial particle background load
    generateParticles();

    // Resize handler to update background particles count gracefully
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (ambientParticlesCheck.checked) {
                generateParticles();
            }
        }, 500);
    });

    // Toast Notifications System (Fully client-side, elegant & non-blocking)
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `custom-toast toast-${type}`;
        
        let iconClass = 'fa-check-circle';
        if (type === 'warning') iconClass = 'fa-exclamation-circle';
        if (type === 'error') iconClass = 'fa-times-circle';
        
        toast.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <span>${message}</span>
        `;
        
        // CSS Style Injector for Toast (keeps main style.css cleaner)
        if (!document.getElementById('toast-injected-style')) {
            const style = document.createElement('style');
            style.id = 'toast-injected-style';
            style.innerHTML = `
                .custom-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(15, 15, 27, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #fff;
                    padding: 12px 20px;
                    border-radius: 10px;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                    transform: translateY(-20px);
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .custom-toast.show {
                    transform: translateY(0);
                    opacity: 1;
                }
                .toast-success i { color: #10b981; }
                .toast-warning i { color: #f59e0b; }
                .toast-error i { color: #ef4444; }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        // Force reflow and show
        setTimeout(() => toast.classList.add('show'), 50);
        
        // Remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
});
