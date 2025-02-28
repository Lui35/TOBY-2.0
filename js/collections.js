const collections = {
    data: [],
    selectedItem: null,

    /**
     * Initialize collections
     */
    init: async () => {
        try {
            const result = await storage.load('collections');
            collections.data = result?.collections || [];
            collections.render();

            // Set up new collection button
            const newCollectionBtn = document.getElementById('newCollection');
            if (newCollectionBtn) {
                newCollectionBtn.addEventListener('click', collections.showCreateModal);
            }

            // Make collections container droppable
            const collectionsContainer = document.getElementById('collections');
            if (collectionsContainer) {
                utils.makeDroppable(collectionsContainer, collections.handleDrop);
            }

            // Add keyboard event listener for reordering
            document.addEventListener('keydown', collections.handleKeyPress);
            
            // Add click event listener to deselect items when clicking outside
            document.addEventListener('click', collections.handleDocumentClick);
        } catch (error) {
            console.error('Error initializing collections:', error);
            collections.data = [];
        }
    },

    /**
     * Handle keyboard events for reordering
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyPress: async (e) => {
        if (!collections.selectedItem) return;

        const { collectionId, itemId } = collections.selectedItem;
        const collection = collections.data.find(c => c.id === collectionId);
        if (!collection) return;

        const currentIndex = collection.items.findIndex(item => item.id === itemId);
        if (currentIndex === -1) return;

        let newIndex = currentIndex;

        if (e.key === 'ArrowLeft' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        } else if (e.key === 'ArrowRight' && currentIndex < collection.items.length - 1) {
            newIndex = currentIndex + 1;
        } else {
            return;
        }

        // Get the current item element and its container
        const itemsContainer = document.querySelector(`.collection[data-id="${collectionId}"] .collection-items`);
        const currentItem = itemsContainer.querySelector(`.item[data-id="${itemId}"]`);
        const targetItem = Array.from(itemsContainer.children)[newIndex];
        if (!currentItem || !targetItem || !itemsContainer) return;

        // Calculate positions for smooth animation
        const currentRect = currentItem.getBoundingClientRect();
        const targetRect = targetItem.getBoundingClientRect();
        const deltaX = targetRect.left - currentRect.left;
        const deltaY = targetRect.top - currentRect.top;

        // Animate current item
        currentItem.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        currentItem.classList.add('reordering');

        // Animate target item
        targetItem.style.transform = `translate(${-deltaX}px, ${-deltaY}px)`;
        targetItem.classList.add('reordering');

        // Update data array
        const [item] = collection.items.splice(currentIndex, 1);
        collection.items.splice(newIndex, 0, item);

        // Wait for animation
        await new Promise(resolve => setTimeout(resolve, 200));

        // Update DOM without re-rendering
        if (newIndex > currentIndex) {
            targetItem.insertAdjacentElement('afterend', currentItem);
        } else {
            targetItem.insertAdjacentElement('beforebegin', currentItem);
        }

        // Reset transforms
        currentItem.style.transform = '';
        targetItem.style.transform = '';
        currentItem.classList.remove('reordering');
        targetItem.classList.remove('reordering');

        // Save changes
        await collections.save();
    },

    /**
     * Handle document click to deselect items
     * @param {MouseEvent} e - Mouse event
     */
    handleDocumentClick: (e) => {
        // If no item is selected, do nothing
        if (!collections.selectedItem) return;
        
        // Check if click was on an item or its child elements
        const clickedOnItem = e.target.closest('.item');
        const clickedOnSelectBtn = e.target.closest('.select-btn');
        
        // If clicked outside an item or on a different item than the selected one, deselect
        if (!clickedOnItem && !clickedOnSelectBtn) {
            collections.deselectItem();
        }
    },
    
    /**
     * Deselect the currently selected item
     */
    deselectItem: () => {
        // Clear previous selection
        const previousSelected = document.querySelector('.item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }
        
        // Reset selected item
        collections.selectedItem = null;
    },

    /**
     * Select an item
     * @param {string} collectionId - Collection ID
     * @param {string} itemId - Item ID
     */
    selectItem: (collectionId, itemId) => {
        // Check if the same item is being selected again
        if (collections.selectedItem && 
            collections.selectedItem.collectionId === collectionId && 
            collections.selectedItem.itemId === itemId) {
            // If the same item is clicked, deselect it
            collections.deselectItem();
            return;
        }
        
        // Clear previous selection
        const previousSelected = document.querySelector('.item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        // Update selected item
        collections.selectedItem = { collectionId, itemId };

        // Add selected class to new item
        const newSelected = document.querySelector(`.item[data-id="${itemId}"]`);
        if (newSelected) {
            newSelected.classList.add('selected');
        }
    },

    /**
     * Show create collection modal
     */
    showCreateModal: () => {
        const modal = collections.createModal('Create New Collection', '', (name) => {
            collections.create(name);
        });
        document.body.appendChild(modal);
    },

    /**
     * Show edit collection modal
     * @param {string} id - Collection ID
     * @param {string} currentName - Current collection name
     */
    showEditModal: (id, currentName) => {
        const modal = collections.createModal('Edit Collection', currentName, (name) => {
            collections.update(id, { name });
        });
        document.body.appendChild(modal);
    },

    /**
     * Show edit item modal
     * @param {string} collectionId - Collection ID
     * @param {string} itemId - Item ID
     * @param {Object} currentItem - Current item data
     */
    showEditItemModal: (collectionId, itemId, currentItem) => {
        const modal = collections.createItemModal('Edit Item', currentItem, (item) => {
            collections.updateItem(collectionId, itemId, item);
        });
        document.body.appendChild(modal);
    },

    /**
     * Create a modal element
     * @param {string} title - Modal title
     * @param {string} defaultValue - Default input value
     * @param {Function} onConfirm - Callback function when confirmed
     * @returns {HTMLElement} Modal element
     */
    createModal: (title, defaultValue, onConfirm) => {
        const overlay = utils.createElement('div', { className: 'modal-overlay' });
        const modal = utils.createElement('div', { className: 'modal' });

        const header = utils.createElement('div', { className: 'modal-header' });
        const titleEl = utils.createElement('h3', {
            className: 'modal-title',
            textContent: title
        });
        header.appendChild(titleEl);

        const content = utils.createElement('div', { className: 'modal-content' });
        const input = utils.createElement('input', {
            className: 'modal-input',
            type: 'text',
            value: defaultValue,
            placeholder: 'Enter name'
        });
        content.appendChild(input);

        const actions = utils.createElement('div', { className: 'modal-actions' });
        const cancelBtn = utils.createElement('button', {
            className: 'modal-button cancel',
            textContent: 'Cancel'
        });
        const confirmBtn = utils.createElement('button', {
            className: 'modal-button confirm',
            textContent: 'Confirm'
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);

        modal.appendChild(header);
        modal.appendChild(content);
        modal.appendChild(actions);
        overlay.appendChild(modal);

        const closeModal = () => {
            document.body.removeChild(overlay);
        };

        cancelBtn.addEventListener('click', closeModal);
        confirmBtn.addEventListener('click', () => {
            const value = input.value.trim();
            if (value) {
                onConfirm(value);
                closeModal();
            }
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const value = input.value.trim();
                if (value) {
                    onConfirm(value);
                    closeModal();
                }
            }
        });

        return overlay;
    },

    /**
     * Create a modal for editing items
     * @param {string} title - Modal title
     * @param {Object} currentItem - Current item data
     * @param {Function} onConfirm - Callback function when confirmed
     * @returns {HTMLElement} Modal element
     */
    createItemModal: (title, currentItem, onConfirm) => {
        const overlay = utils.createElement('div', { className: 'modal-overlay' });
        const modal = utils.createElement('div', { className: 'modal' });

        const header = utils.createElement('div', { className: 'modal-header' });
        const titleEl = utils.createElement('h3', {
            className: 'modal-title',
            textContent: title
        });
        header.appendChild(titleEl);

        const content = utils.createElement('div', { className: 'modal-content' });
        
        const titleInput = utils.createElement('input', {
            className: 'modal-input',
            type: 'text',
            value: currentItem.title,
            placeholder: 'Enter title'
        });

        const urlInput = utils.createElement('input', {
            className: 'modal-input',
            type: 'text',
            value: currentItem.url,
            placeholder: 'Enter URL'
        });

        content.appendChild(titleInput);
        content.appendChild(urlInput);

        const actions = utils.createElement('div', { className: 'modal-actions' });
        const cancelBtn = utils.createElement('button', {
            className: 'modal-button cancel',
            textContent: 'Cancel'
        });
        const confirmBtn = utils.createElement('button', {
            className: 'modal-button confirm',
            textContent: 'Confirm'
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);

        modal.appendChild(header);
        modal.appendChild(content);
        modal.appendChild(actions);
        overlay.appendChild(modal);

        const closeModal = () => {
            document.body.removeChild(overlay);
        };

        cancelBtn.addEventListener('click', closeModal);
        confirmBtn.addEventListener('click', () => {
            const title = titleInput.value.trim();
            const url = urlInput.value.trim();
            if (title && url) {
                onConfirm({ title, url, favicon: currentItem.favicon });
                closeModal();
            }
        });

        return overlay;
    },

    /**
     * Create a new collection
     * @param {string} name - Collection name
     */
    create: async (name) => {
        try {
            const collection = {
                id: utils.generateId(),
                name: name,
                items: []
            };

            collections.data.push(collection);
            await collections.save();
            collections.render();
        } catch (error) {
            console.error('Error creating collection:', error);
        }
    },

    /**
     * Delete a collection
     * @param {string} id - Collection ID
     */
    delete: async (id) => {
        try {
            const collectionIndex = collections.data.findIndex(c => c.id === id);
            
            if (collectionIndex === -1) {
                console.error('Collection not found:', id);
                return;
            }
            
            const collection = collections.data[collectionIndex];
            
            // Initial confirmation with collection name
            const confirmDelete = confirm(`Are you sure you want to delete the collection "${collection.name}"?`);
            
            if (!confirmDelete) {
                return;
            }
            
            // Additional warning if collection has items
            if (collection.items && collection.items.length > 0) {
                const itemCount = collection.items.length;
                const confirmWithItems = confirm(`This collection contains ${itemCount} item${itemCount !== 1 ? 's' : ''}. Are you sure you want to delete it?`);
                
                if (!confirmWithItems) {
                    return;
                }
            }
            
            collections.data = collections.data.filter(c => c.id !== id);
            await collections.save();
            collections.render();
        } catch (error) {
            console.error('Error deleting collection:', error);
        }
    },

    /**
     * Update a collection
     * @param {string} id - Collection ID
     * @param {Object} updates - Updates to apply
     */
    update: async (id, updates) => {
        try {
            collections.data = collections.data.map(c => 
                c.id === id ? { ...c, ...updates } : c
            );
            await collections.save();
            collections.render();
        } catch (error) {
            console.error('Error updating collection:', error);
        }
    },

    /**
     * Add item to collection
     * @param {string} collectionId - Collection ID
     * @param {Object} item - Item to add
     */
    addItem: async (collectionId, item) => {
        try {
            const collection = collections.data.find(c => c.id === collectionId);
            if (collection) {
                collection.items.push({
                    id: utils.generateId(),
                    ...item
                });
                await collections.save();
                collections.render();
            }
        } catch (error) {
            console.error('Error adding item to collection:', error);
        }
    },

    /**
     * Remove item from collection
     * @param {string} collectionId - Collection ID
     * @param {string} itemId - Item ID
     */
    removeItem: async (collectionId, itemId) => {
        try {
            const collection = collections.data.find(c => c.id === collectionId);
            if (!collection) {
                console.error('Collection not found:', collectionId);
                return;
            }
            
            const item = collection.items.find(i => i.id === itemId);
            if (!item) {
                console.error('Item not found in collection:', itemId);
                return;
            }
            
            // Show confirmation dialog
            const confirmRemoval = confirm(`Are you sure you want to remove "${item.title}" from "${collection.name}"?`);
            
            if (confirmRemoval) {
                collection.items = collection.items.filter(item => item.id !== itemId);
                await collections.save();
                collections.render();
            }
        } catch (error) {
            console.error('Error removing item from collection:', error);
        }
    },

    /**
     * Handle drop event
     * @param {Object} data - Dropped data
     */
    handleDrop: (data) => {
        try {
            if (data.type === 'tab') {
                collections.addItem(data.collectionId, {
                    title: data.title,
                    url: data.url,
                    favicon: data.favicon
                });
            }
        } catch (error) {
            console.error('Error handling drop:', error);
        }
    },

    /**
     * Save collections to storage
     */
    save: async () => {
        try {
            await storage.save({ collections: collections.data });
        } catch (error) {
            console.error('Error saving collections:', error);
        }
    },

    /**
     * Update an item in a collection
     * @param {string} collectionId - Collection ID
     * @param {string} itemId - Item ID
     * @param {Object} updates - Updates to apply
     */
    updateItem: async (collectionId, itemId, updates) => {
        try {
            const collection = collections.data.find(c => c.id === collectionId);
            if (collection) {
                collection.items = collection.items.map(item =>
                    item.id === itemId ? { ...item, ...updates } : item
                );
                await collections.save();
                collections.render();
            }
        } catch (error) {
            console.error('Error updating item:', error);
        }
    },

    /**
     * Render collections
     */
    render: () => {
        try {
            const container = document.getElementById('collections');
            if (!container) return;
            
            container.innerHTML = '';

            if (!Array.isArray(collections.data)) {
                collections.data = [];
                return;
            }

            collections.data.forEach(collection => {
                const collectionEl = utils.createElement('div', {
                    className: 'collection',
                    'data-id': collection.id
                });

                const header = utils.createElement('div', {
                    className: 'collection-header'
                });

                const titleContainer = utils.createElement('div', {
                    className: 'collection-title-container',
                    style: 'display: flex; align-items: center; gap: 8px;'
                });

                const title = utils.createElement('div', {
                    className: 'collection-title',
                    textContent: collection.name
                });

                titleContainer.appendChild(title);

                const buttonsContainer = utils.createElement('div', {
                    className: 'collection-header-buttons'
                });

                const editBtn = utils.createElement('button', {
                    className: 'edit-collection',
                    textContent: '✎',
                    title: 'Edit collection'
                });

                const deleteBtn = utils.createElement('button', {
                    className: 'delete-collection',
                    textContent: '🗑️',
                    title: 'Delete collection'
                });

                editBtn.addEventListener('click', () => collections.showEditModal(collection.id, collection.name));
                deleteBtn.addEventListener('click', () => {
                    collections.delete(collection.id);
                });

                buttonsContainer.appendChild(editBtn);
                buttonsContainer.appendChild(deleteBtn);

                header.appendChild(titleContainer);
                header.appendChild(buttonsContainer);

                const itemsContainer = utils.createElement('div', {
                    className: 'collection-items'
                });

                if (Array.isArray(collection.items)) {
                    collection.items.forEach(item => {
                        const itemEl = utils.createElement('div', {
                            className: `item${collections.selectedItem?.itemId === item.id ? ' selected' : ''}`,
                            'data-id': item.id
                        });

                        const favicon = utils.createElement('img', {
                            className: 'favicon',
                            src: item.favicon || 'icons/default-favicon.png'
                        });

                        favicon.addEventListener('error', (e) => {
                            e.target.src = 'icons/default-favicon.png';
                        });

                        const itemTitle = utils.createElement('span', {
                            className: 'title',
                            textContent: item.title
                        });

                        const selectBtn = utils.createElement('button', {
                            className: 'select-btn',
                            textContent: '⋮',
                            title: 'Select for reordering'
                        });

                        selectBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            collections.selectItem(collection.id, item.id);
                        });

                        const editBtn = utils.createElement('button', {
                            className: 'edit-btn',
                            textContent: '✎'
                        });

                        editBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            collections.showEditItemModal(collection.id, item.id, item);
                        });

                        const removeBtn = utils.createElement('button', {
                            className: 'remove-item',
                            textContent: '×'
                        });

                        removeBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            collections.removeItem(collection.id, item.id);
                        });

                        itemEl.appendChild(favicon);
                        itemEl.appendChild(itemTitle);
                        itemEl.appendChild(selectBtn);
                        itemEl.appendChild(editBtn);
                        itemEl.appendChild(removeBtn);

                        itemEl.addEventListener('click', () => {
                            chrome.tabs.create({ url: item.url });
                        });

                        itemsContainer.appendChild(itemEl);
                    });
                }

                collectionEl.appendChild(header);
                collectionEl.appendChild(itemsContainer);
                container.appendChild(collectionEl);

                utils.makeDroppable(collectionEl, (data) => {
                    if (data.type === 'tab') {
                        collections.addItem(collection.id, {
                            title: data.title,
                            url: data.url,
                            favicon: data.favicon
                        });
                    }
                });
            });
        } catch (error) {
            console.error('Error rendering collections:', error);
        }
    },

    /**
     * Export collections to JSON file
     */
    exportCollections: () => {
        try {
            // Create a JSON string of the collections data
            const collectionsData = JSON.stringify(collections.data, null, 2);
            
            // Create a Blob with the JSON data
            const blob = new Blob([collectionsData], { type: 'application/json' });
            
            // Create a URL for the Blob
            const url = URL.createObjectURL(blob);
            
            // Create a temporary anchor element to trigger the download
            const a = document.createElement('a');
            a.href = url;
            a.download = `toby-collections-${new Date().toISOString().split('T')[0]}.json`;
            
            // Append the anchor to the body, click it, and remove it
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error('Error exporting collections:', error);
            alert('Failed to export collections. Please try again.');
        }
    },

    /**
     * Import collections from JSON file
     */
    importCollections: () => {
        try {
            // Create a file input element
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            
            // Add change event listener to handle the selected file
            fileInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                // Read the file content
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        // Parse the JSON data
                        const rawData = JSON.parse(e.target.result);
                        let importedData;
                        
                        // Helper function to extract domain and create favicon
                        const createFaviconFromUrl = (urlString) => {
                            try {
                                const url = new URL(urlString);
                                const domain = url.hostname;
                                return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                            } catch (error) {
                                console.warn('Error generating favicon for URL:', urlString, error);
                                return 'icons/default-favicon.png';
                            }
                        };
                        
                        // Handle different JSON formats
                        if (Array.isArray(rawData)) {
                            // Original format: array of collections
                            importedData = rawData.map(collection => {
                                // Make sure all items have favicons
                                if (collection.items && Array.isArray(collection.items)) {
                                    collection.items = collection.items.map(item => {
                                        // Only add favicon if it doesn't exist and URL is valid
                                        if (!item.favicon && item.url) {
                                            item.favicon = createFaviconFromUrl(item.url);
                                        }
                                        return item;
                                    });
                                }
                                return collection;
                            });
                        } else if (rawData.version && Array.isArray(rawData.lists)) {
                            // New format with version and lists
                            importedData = rawData.lists.map(list => {
                                return {
                                    id: utils.generateId(),
                                    name: list.title,
                                    items: list.cards.map(card => {
                                        return {
                                            id: utils.generateId(),
                                            title: card.customTitle || card.title,
                                            url: card.url,
                                            description: card.customDescription || '',
                                            favicon: createFaviconFromUrl(card.url)
                                        };
                                    })
                                };
                            });
                        } else {
                            throw new Error('Invalid import format. Expected an array of collections or a JSON object with version and lists.');
                        }
                        
                        // Validate the imported data
                        if (!Array.isArray(importedData)) {
                            throw new Error('Failed to process import data.');
                        }
                        
                        // Confirm import with the user
                        if (confirm(`Import ${importedData.length} collections? This will merge with your existing collections.`)) {
                            // Merge the imported collections with existing ones
                            // Add only collections that don't exist (based on ID)
                            const existingIds = collections.data.map(c => c.id);
                            const newCollections = importedData.filter(c => !existingIds.includes(c.id));
                            
                            collections.data = [...collections.data, ...newCollections];
                            
                            // Save and render the updated collections
                            await collections.save();
                            collections.render();
                            
                            alert(`Successfully imported ${newCollections.length} new collections.`);
                        }
                    } catch (error) {
                        console.error('Error processing import file:', error);
                        alert('Failed to import collections. The file may be invalid or corrupted.');
                    }
                };
                
                reader.readAsText(file);
            });
            
            // Trigger the file selection dialog
            fileInput.click();
        } catch (error) {
            console.error('Error importing collections:', error);
            alert('Failed to import collections. Please try again.');
        }
    },
}; 