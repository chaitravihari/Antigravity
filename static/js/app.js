// -------------------------------------------------------------
// BigQuery Release Pulse - Main Frontend Application Logic
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Application State
    let releasesData = [];
    let filteredReleases = [];
    let selectedUpdates = new Map(); // Key: 'entryId-updateIndex', Value: { entry, update, index }
    let lastFetchedTime = null;
    
    // DOM Elements
    const releasesContainer = document.getElementById('releases-container');
    const refreshBtn = document.getElementById('refresh-btn');
    const lastUpdatedSpan = document.getElementById('last-updated');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const typeFiltersContainer = document.getElementById('type-filters');
    
    // Selection Status Bar
    const selectionStatusBar = document.getElementById('selection-status-bar');
    const selectionCountSpan = document.getElementById('selection-count');
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    const openComposerBtn = document.getElementById('open-composer-btn');
    
    // Composer Drawer
    const composerDrawer = document.getElementById('composer-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const closeComposerBtn = document.getElementById('close-composer-btn');
    const selectedListPreview = document.getElementById('selected-list-preview');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charsLeftSpan = document.getElementById('chars-left');
    const progressRingIndicator = document.getElementById('progress-ring-indicator');
    const copyTweetBtn = document.getElementById('copy-tweet-btn');
    const tweetShareBtn = document.getElementById('tweet-share-btn');
    
    // Editor Helpers
    const btnShorten = document.getElementById('btn-shorten');
    const btnEmojis = document.getElementById('btn-emojis');
    const btnResetTweet = document.getElementById('btn-reset-tweet');

    // Original generated tweet content (stored for reset functionality)
    let originalGeneratedTweet = "";

    // Circular Progress Ring Math
    const ringRadius = 12;
    const ringCircumference = 2 * Math.PI * ringRadius; // ~75.4
    if (progressRingIndicator) {
        progressRingIndicator.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
        progressRingIndicator.style.strokeDashoffset = ringCircumference;
    }

    // -------------------------------------------------------------
    // 1. Theme Controller
    // -------------------------------------------------------------
    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    };

    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        showToast(`Switched to ${newTheme} mode`, 'info');
    };

    themeToggleBtn.addEventListener('click', toggleTheme);
    initTheme();

    // -------------------------------------------------------------
    // 2. Fetch and Render Feed Data
    // -------------------------------------------------------------
    const formatRelativeTime = (timestamp) => {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diffSecs = Math.floor((now - date) / 1000);
        
        if (diffSecs < 60) return 'Just now';
        if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
        if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const updateLastUpdatedDisplay = () => {
        if (lastFetchedTime) {
            lastUpdatedSpan.textContent = formatRelativeTime(lastFetchedTime);
        }
    };

    // Update relative timestamps periodically
    setInterval(updateLastUpdatedDisplay, 60000);

    const fetchReleaseNotes = async (forceRefresh = false) => {
        try {
            if (forceRefresh) {
                refreshBtn.classList.add('spinning');
            }
            
            const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`API HTTP Error: ${response.status}`);
            }
            
            const data = await response.json();
            
            releasesData = data.releases || [];
            lastFetchedTime = data.last_fetched;
            updateLastUpdatedDisplay();
            
            if (forceRefresh) {
                showToast("Release notes feed refreshed successfully", "success");
            }
            
            applyFilters();
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showToast("Failed to fetch release notes: " + error.message, "error");
            
            // Render error state if no data is available
            if (releasesData.length === 0) {
                renderErrorState(error.message);
            }
        } finally {
            refreshBtn.classList.remove('spinning');
        }
    };

    const renderErrorState = (msg) => {
        releasesContainer.innerHTML = `
            <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h4>Unable to Load Feed</h4>
                <p>${msg}. Click the refresh button to try again.</p>
            </div>
        `;
    };

    const renderEmptyState = () => {
        releasesContainer.innerHTML = `
            <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <h4>No matching updates found</h4>
                <p>Try adjusting your search terms or filters.</p>
            </div>
        `;
    };

    const renderReleaseStream = (datesList) => {
        if (!datesList || datesList.length === 0) {
            renderEmptyState();
            return;
        }

        releasesContainer.innerHTML = '';
        
        datesList.forEach((entry) => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            
            const dateTitle = document.createElement('h3');
            dateTitle.className = 'date-title';
            dateTitle.textContent = entry.date;
            
            const updatesListDiv = document.createElement('div');
            updatesListDiv.className = 'updates-list';
            
            entry.updates.forEach((update, idx) => {
                const updateId = `${entry.id}-${idx}`;
                const isSelected = selectedUpdates.has(updateId);
                
                const card = document.createElement('div');
                card.className = `update-card ${isSelected ? 'selected' : ''}`;
                card.setAttribute('data-id', updateId);
                card.setAttribute('data-type', update.type);
                
                // Card header
                const cardHeader = document.createElement('div');
                cardHeader.className = 'card-header';
                
                const badge = document.createElement('span');
                badge.className = 'type-badge';
                badge.innerHTML = `
                    <span class="badge-dot"></span>
                    ${update.type}
                `;
                
                const checkboxContainer = document.createElement('div');
                checkboxContainer.className = 'card-select-container';
                checkboxContainer.innerHTML = `
                    <div class="card-checkbox">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                `;
                
                cardHeader.appendChild(badge);
                cardHeader.appendChild(checkboxContainer);
                
                // Card body
                const cardBody = document.createElement('div');
                cardBody.className = 'card-body';
                cardBody.innerHTML = update.html;
                
                // Card footer
                const cardFooter = document.createElement('div');
                cardFooter.className = 'card-footer';
                
                const tweetBtn = document.createElement('button');
                tweetBtn.className = 'card-tweet-action';
                tweetBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Tweet This
                `;
                
                // Stop event bubbling for tweet button to prevent card selection toggle
                tweetBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    tweetSingleUpdate(entry, update, idx);
                });
                
                cardFooter.appendChild(tweetBtn);
                
                card.appendChild(cardHeader);
                card.appendChild(cardBody);
                card.appendChild(cardFooter);
                
                // Click listener to toggle selection
                card.addEventListener('click', () => {
                    toggleCardSelection(updateId, entry, update, idx);
                });
                
                updatesListDiv.appendChild(card);
            });
            
            dateGroup.appendChild(dateTitle);
            dateGroup.appendChild(updatesListDiv);
            releasesContainer.appendChild(dateGroup);
        });
    };

    // -------------------------------------------------------------
    // 3. Selection and Multi-Select Logic
    // -------------------------------------------------------------
    const toggleCardSelection = (id, entry, update, idx) => {
        const cardElement = document.querySelector(`.update-card[data-id="${id}"]`);
        
        if (selectedUpdates.has(id)) {
            selectedUpdates.delete(id);
            if (cardElement) cardElement.classList.remove('selected');
        } else {
            selectedUpdates.set(id, { entry, update, index: idx });
            if (cardElement) cardElement.classList.add('selected');
        }
        
        updateSelectionStatusBar();
    };

    const updateSelectionStatusBar = () => {
        const count = selectedUpdates.size;
        
        if (count > 0) {
            selectionCountSpan.textContent = `${count} update${count > 1 ? 's' : ''} selected`;
            selectionStatusBar.style.display = 'flex';
        } else {
            selectionStatusBar.style.display = 'none';
        }
    };

    const clearAllSelection = () => {
        selectedUpdates.clear();
        document.querySelectorAll('.update-card.selected').forEach(card => {
            card.classList.remove('selected');
        });
        updateSelectionStatusBar();
        showToast("Selection cleared", "info");
    };

    clearSelectionBtn.addEventListener('click', clearAllSelection);

    // -------------------------------------------------------------
    // 4. Filter & Search Handlers
    // -------------------------------------------------------------
    let activeFilterType = 'all';
    let searchQuery = '';

    const applyFilters = () => {
        searchQuery = searchInput.value.trim().toLowerCase();
        
        // Show/hide clear search button
        if (searchQuery) {
            searchClearBtn.style.display = 'block';
        } else {
            searchClearBtn.style.display = 'none';
        }
        
        // Deep copy structure so we don't modify raw cached feed data
        filteredReleases = JSON.parse(JSON.stringify(releasesData));
        
        // Step 1: Filter updates in each date entry
        filteredReleases = filteredReleases.map(entry => {
            entry.updates = entry.updates.filter(update => {
                // Type Filter match
                const typeMatches = activeFilterType === 'all' || 
                                    update.type.toLowerCase() === activeFilterType.toLowerCase();
                                    
                // Keyword Search match
                const searchMatches = !searchQuery || 
                                     update.text.toLowerCase().includes(searchQuery) ||
                                     update.type.toLowerCase().includes(searchQuery) ||
                                     entry.date.toLowerCase().includes(searchQuery);
                                     
                return typeMatches && searchMatches;
            });
            return entry;
        });
        
        // Step 2: Remove dates that have no updates left
        filteredReleases = filteredReleases.filter(entry => entry.updates.length > 0);
        
        // Render filtered stream
        renderReleaseStream(filteredReleases);
    };

    // Pill Category Filter click listeners
    typeFiltersContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        
        // Remove active class from siblings
        typeFiltersContainer.querySelectorAll('.filter-pill').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Set active class
        pill.classList.add('active');
        activeFilterType = pill.getAttribute('data-type');
        
        applyFilters();
    });

    // Search input listener with basic debounce
    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFilters();
        }, 150);
    });

    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
        applyFilters();
    });

    // Force Refresh listener
    refreshBtn.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // -------------------------------------------------------------
    // 5. Tweet Generator & Composer Drawer
    // -------------------------------------------------------------
    const getCleanShortDescription = (text, maxLength) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    };

    const generateTweetText = (selections) => {
        if (selections.length === 0) return "";
        
        const hashTags = " #BigQuery #GoogleCloud";
        
        if (selections.length === 1) {
            const { entry, update } = selections[0];
            const dateStr = entry.date;
            
            // Format:
            // 📢 BigQuery Update (June 17, 2026)
            // Feature: [Description]
            //
            // Read more: [Link]
            const header = `📢 BigQuery Update (${dateStr})\n${update.type}: `;
            const footer = `\n\nRead more: ${entry.link}${hashTags}`;
            
            // How much space do we have for the main description?
            const reservedLength = header.length + footer.length;
            const descMaxLen = 280 - reservedLength;
            
            const cleanDesc = getCleanShortDescription(update.text, descMaxLen);
            return `${header}${cleanDesc}${footer}`;
        } else {
            // Sorting selected items by date (descending)
            const sortedSelections = [...selections].sort((a, b) => {
                return new Date(b.entry.updated) - new Date(a.entry.updated);
            });
            
            // Multi-tweet formatting
            const uniqueDates = [...new Set(sortedSelections.map(s => s.entry.date))];
            let dateRangeStr = "";
            if (uniqueDates.length === 1) {
                dateRangeStr = uniqueDates[0];
            } else {
                dateRangeStr = `${uniqueDates[uniqueDates.length - 1]} - ${uniqueDates[0]}`;
            }
            
            const header = `📢 BigQuery Updates (${dateRangeStr})\n`;
            // Standard feed link (without anchor)
            const baseLink = "https://docs.cloud.google.com/bigquery/docs/release-notes";
            const footer = `\nRead more: ${baseLink}${hashTags}`;
            
            // Build bullet points
            let bulletPoints = [];
            sortedSelections.forEach(s => {
                bulletPoints.push(`- ${s.update.type}: ${s.update.text}`);
            });
            
            // Fit as many bullet points as possible
            let compiledText = "";
            let finalBulletsStr = "";
            
            // Simple helper to compile a draft
            const makeDraft = (bullets) => `${header}${bullets.join('\n')}${footer}`;
            
            if (makeDraft(bulletPoints).length <= 280) {
                finalBulletsStr = bulletPoints.join('\n');
            } else {
                // Shorten bullets or select fewer bullets
                // Let's create shortened version of bullets
                let shortBullets = sortedSelections.map(s => {
                    // Truncate individual items so they are compact
                    const cleanItemText = getCleanShortDescription(s.update.text, 45);
                    return `- ${s.update.type}: ${cleanItemText}`;
                });
                
                if (makeDraft(shortBullets).length <= 280) {
                    finalBulletsStr = shortBullets.join('\n');
                } else {
                    // Try listing just the headlines, falling back to a count
                    let ultraShortBullets = sortedSelections.map(s => `- ${s.update.type}`);
                    if (makeDraft(ultraShortBullets).length <= 280) {
                        finalBulletsStr = ultraShortBullets.join('\n');
                    } else {
                        finalBulletsStr = `Multiple new ${sortedSelections.map(s => s.update.type.toLowerCase()).join(', ')} updates available!`;
                    }
                }
            }
            
            return `${header}${finalBulletsStr}${footer}`;
        }
    };

    const openComposer = (selections) => {
        if (selections.length === 0) return;
        
        // Populate preview list
        selectedListPreview.innerHTML = '';
        selections.forEach(({ entry, update }) => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${entry.date}</strong>: ${update.type} - <em>${getCleanShortDescription(update.text, 60)}</em>`;
            selectedListPreview.appendChild(li);
        });
        
        // Generate tweet text
        const text = generateTweetText(selections);
        originalGeneratedTweet = text;
        tweetTextarea.value = text;
        
        // Update word and progress count
        updateCharCounter();
        
        // Open drawer UI
        composerDrawer.classList.add('open');
        tweetTextarea.focus();
    };

    const closeComposer = () => {
        composerDrawer.classList.remove('open');
    };

    const updateCharCounter = () => {
        const text = tweetTextarea.value;
        const textLen = text.length;
        const left = 280 - textLen;
        
        charsLeftSpan.textContent = left;
        
        // Progress indicator update
        const percentage = Math.min(100, (textLen / 280) * 100);
        const offset = ringCircumference - (percentage / 100) * ringCircumference;
        
        if (progressRingIndicator) {
            progressRingIndicator.style.strokeDashoffset = offset;
            
            // Color indicators depending on length remaining
            if (left <= 0) {
                progressRingIndicator.style.stroke = 'var(--color-issue)'; // Red
                charsLeftSpan.className = 'chars-left danger';
            } else if (left < 30) {
                progressRingIndicator.style.stroke = '#f59e0b'; // Orange
                charsLeftSpan.className = 'chars-left warning';
            } else {
                progressRingIndicator.style.stroke = 'var(--color-primary)'; // Blue
                charsLeftSpan.className = 'chars-left';
            }
        }
    };

    // Open composer from selected bar
    openComposerBtn.addEventListener('click', () => {
        const selections = Array.from(selectedUpdates.values());
        openComposer(selections);
    });

    // Tweet single card immediately from individual button
    const tweetSingleUpdate = (entry, update, idx) => {
        // Build selection list with just this single item
        const singleSelection = [{ entry, update, index: idx }];
        openComposer(singleSelection);
    };

    closeComposerBtn.addEventListener('click', closeComposer);
    drawerOverlay.addEventListener('click', closeComposer);
    tweetTextarea.addEventListener('input', updateCharCounter);

    // -------------------------------------------------------------
    // 6. Tweet Helper Utilities (Shorten, Reset, Emojis)
    // -------------------------------------------------------------
    btnResetTweet.addEventListener('click', () => {
        tweetTextarea.value = originalGeneratedTweet;
        updateCharCounter();
        showToast("Restored original generated text", "info");
    });

    btnShorten.addEventListener('click', () => {
        const text = tweetTextarea.value;
        if (text.length <= 280) {
            showToast("Tweet is already within the 280 character limit", "info");
            return;
        }

        // Intelligently shorten tweet.
        // We look for the main content body (between the title line/badge and the link footer) and truncate that.
        const lines = text.split('\n');
        
        // Find line index with Read more links
        let readMoreIdx = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].includes("Read more:")) {
                readMoreIdx = i;
                break;
            }
        }
        
        if (readMoreIdx !== -1) {
            // We have a clear footer.
            // Let's combine the headers
            const headerLines = lines.slice(0, 2);
            const footerLines = lines.slice(readMoreIdx);
            const bodyLines = lines.slice(2, readMoreIdx);
            
            const headerText = headerLines.join('\n') + '\n';
            const footerText = '\n' + footerLines.join('\n');
            
            const reserved = headerText.length + footerText.length;
            const availableSpace = 280 - reserved;
            
            if (availableSpace > 10) {
                const bodyText = bodyLines.join('\n');
                const truncatedBody = getCleanShortDescription(bodyText, availableSpace);
                
                tweetTextarea.value = `${headerText}${truncatedBody}${footerText}`;
                updateCharCounter();
                showToast("Intelligently truncated text to fit character limit", "success");
            } else {
                // If header + footer is already too long, do a general truncation
                tweetTextarea.value = getCleanShortDescription(text, 280);
                updateCharCounter();
                showToast("Truncated entire post to 280 characters", "success");
            }
        } else {
            // General fallback truncation
            tweetTextarea.value = getCleanShortDescription(text, 280);
            updateCharCounter();
            showToast("Truncated text to 280 characters", "success");
        }
    });

    btnEmojis.addEventListener('click', () => {
        let text = tweetTextarea.value;
        const tag = " #BigQuery";
        
        // Prepend an emoji if not present
        if (!text.startsWith("📢") && !text.startsWith("🚀") && !text.startsWith("🔥")) {
            text = "🚀 " + text;
        }
        
        // Add hashtag if not present
        if (!text.includes("#BigQuery")) {
            // Append right before link or at the end
            if (text.includes("Read more:")) {
                text = text.replace("Read more:", "#BigQuery Read more:");
            } else {
                text = text + tag;
            }
        }
        
        tweetTextarea.value = text;
        updateCharCounter();
        showToast("Added emojis and hashtags", "info");
    });

    // -------------------------------------------------------------
    // 7. Clipboard & Twitter Web Intent Share
    // -------------------------------------------------------------
    copyTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        
        navigator.clipboard.writeText(text).then(() => {
            showToast("Copied post text to clipboard!", "success");
        }).catch(err => {
            console.error('Could not copy text: ', err);
            showToast("Failed to copy text. Please select and copy manually.", "error");
        });
    });

    tweetShareBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        
        if (text.length > 280) {
            showToast("Post is too long. Please shorten to fit the 280 limit before posting.", "error");
            return;
        }
        
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
        showToast("Opening X (Twitter)...", "info");
    });

    // -------------------------------------------------------------
    // 8. Toast Notification System
    // -------------------------------------------------------------
    const showToast = (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconHtml = '';
        if (type === 'success') {
            iconHtml = `
                <svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
        } else if (type === 'error') {
            iconHtml = `
                <svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            `;
        } else {
            iconHtml = `
                <svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
            `;
        }
        
        toast.innerHTML = `
            ${iconHtml}
            <div class="toast-content">${message}</div>
        `;
        
        container.appendChild(toast);
        
        // Remove toast after 4 seconds
        setTimeout(() => {
            toast.classList.add('removing');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, 4000);
    };

    // Initial load
    fetchReleaseNotes();
});
