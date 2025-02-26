const collections = {
    data: [],

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
        } catch (error) {
            console.error('Error initializing collections:', error);
            collections.data = [];
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
            if (collection) {
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

                const title = utils.createElement('div', {
                    className: 'collection-title',
                    textContent: collection.name
                });

                title.addEventListener('click', () => {
                    collections.showEditModal(collection.id, collection.name);
                });

                const deleteBtn = utils.createElement('button', {
                    className: 'delete-collection',
                    textContent: '🗑️'
                });
                deleteBtn.addEventListener('click', () => collections.delete(collection.id));

                header.appendChild(title);
                header.appendChild(deleteBtn);

                const itemsContainer = utils.createElement('div', {
                    className: 'collection-items'
                });

                if (Array.isArray(collection.items)) {
                    collection.items.forEach(item => {
                        const itemEl = utils.createElement('div', {
                            className: 'item'
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
    }
}; 