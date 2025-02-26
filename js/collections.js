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
                newCollectionBtn.addEventListener('click', collections.create);
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
     * Create a new collection
     */
    create: async () => {
        try {
            const collection = {
                id: utils.generateId(),
                name: 'New Collection',
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

                // Make title editable
                title.addEventListener('click', () => {
                    const input = utils.createElement('input', {
                        type: 'text',
                        value: collection.name,
                        className: 'collection-title-input'
                    });
                    
                    input.addEventListener('blur', async () => {
                        const newName = input.value.trim();
                        if (newName && newName !== collection.name) {
                            await collections.update(collection.id, { name: newName });
                        } else {
                            collections.render();
                        }
                    });

                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            input.blur();
                        }
                    });

                    title.replaceWith(input);
                    input.focus();
                    input.select();
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

                        // Add error handler for favicon
                        favicon.addEventListener('error', (e) => {
                            e.target.src = 'icons/default-favicon.png';
                        });

                        const itemTitle = utils.createElement('span', {
                            className: 'title',
                            textContent: item.title
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

                // Make collection droppable
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