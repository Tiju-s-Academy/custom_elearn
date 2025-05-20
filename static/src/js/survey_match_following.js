/**
 * Vanilla JavaScript implementation for match following questions
 * This avoids dependency issues with the Odoo module system
 */
(function() {
    'use strict';

    // Wait for the DOM to load
    document.addEventListener('DOMContentLoaded', function() {
        setupMatchFollowing();
    });

    // Set up the match following functionality
    function setupMatchFollowing() {
        console.log("Setting up match following...");
        
        // Find all match following containers
        const containers = document.querySelectorAll('.match_following_container');
        if (containers.length === 0) {
            console.log("No match following containers found");
            return;
        }

        console.log("Found match following containers:", containers.length);
        
        // Initialize each container
        containers.forEach(function(container) {
            initContainer(container);
        });
    }

    // Initialize a single match following container
    function initContainer(container) {
        // Set up drag and drop
        const items = container.querySelectorAll('.o_match_item');
        items.forEach(function(item) {
            item.setAttribute('draggable', true);
            
            // Add event listeners for drag and drop
            item.addEventListener('dragstart', onDragStart);
            item.addEventListener('dragend', onDragEnd);
        });

        // Add event listeners to drop zones
        const dropZones = container.querySelectorAll('.o_match_questions, .o_match_answers');
        dropZones.forEach(function(zone) {
            zone.addEventListener('dragover', onDragOver);
            zone.addEventListener('dragleave', onDragLeave);
            zone.addEventListener('drop', onDrop);
        });

        // Load any stored answers
        loadStoredAnswers(container);
    }

    // Load stored answers if available
    function loadStoredAnswers(container) {
        const hiddenInput = container.querySelector('input[type="hidden"]');
        if (!hiddenInput || !hiddenInput.value) return;

        try {
            const matches = JSON.parse(hiddenInput.value);
            matches.forEach(function(match) {
                const pairId = match.pair_id;
                if (pairId) {
                    const item = container.querySelector(`.o_match_questions .o_match_item[data-pair-id="${pairId}"]`);
                    if (item) {
                        item.setAttribute('data-matched', 'true');
                        item.classList.add('matched');
                    }
                }
            });
        } catch (e) {
            console.error("Failed to load stored matches", e);
        }
    }

    // Event handler for drag start
    function onDragStart(e) {
        e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
        this.classList.add('dragging');
    }

    // Event handler for drag over
    function onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.classList.add('drop-zone-active');
    }

    // Event handler for drag leave
    function onDragLeave(e) {
        this.classList.remove('drop-zone-active');
    }

    // Event handler for drag end
    function onDragEnd(e) {
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        document.querySelectorAll('.drop-zone-active').forEach(el => el.classList.remove('drop-zone-active'));
    }

    // Event handler for drop
    function onDrop(e) {
        e.preventDefault();
        const container = findClosestContainer(this);
        if (!container) return;
        
        const pairId = e.dataTransfer.getData('text/plain');
        const target = this;
        
        // Handle dropping in answer column
        if (target.classList.contains('o_match_answers')) {
            // Mark the question item as matched
            const questionItem = container.querySelector(`.o_match_questions .o_match_item[data-pair-id="${pairId}"]`);
            if (questionItem) {
                questionItem.setAttribute('data-matched', 'true');
                questionItem.classList.add('matched');
            }
            
            // Remove existing highlight
            container.querySelectorAll(`.o_match_answers .matched-with-${pairId}`).forEach(el => {
                el.classList.remove(`matched-with-${pairId}`);
            });
            
            // Highlight the answer item
            const answerItem = container.querySelector(`.o_match_answers .o_match_item[data-pair-id="${pairId}"]`);
            if (answerItem) {
                answerItem.classList.add('matched');
                answerItem.classList.add(`matched-with-${pairId}`);
            }
        }
        
        // Update the matches in the hidden input
        updateMatches(container);
        
        // Remove any drag and drop styling
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        target.classList.remove('drop-zone-active');
    }

    // Update the matches in the hidden input
    function updateMatches(container) {
        const matches = [];
        
        // Collect all matched pairs
        container.querySelectorAll('.o_match_questions .o_match_item[data-matched="true"]').forEach(function(item) {
            const pairId = item.getAttribute('data-pair-id');
            matches.push({
                pair_id: pairId,
                matched: true
            });
        });
        
        // Update the hidden input
        const hiddenInput = container.querySelector('input[type="hidden"]');
        if (hiddenInput) {
            hiddenInput.value = JSON.stringify(matches);
            
            // Trigger a change event for form handling
            const event = new Event('change', { bubbles: true });
            hiddenInput.dispatchEvent(event);
        }
    }

    // Find the closest match following container to an element
    function findClosestContainer(element) {
        let current = element;
        while (current && !current.classList.contains('match_following_container')) {
            current = current.parentElement;
        }
        return current;
    }

    // Add this code to the window for Odoo compatibility attempts
    window.customElearnMatchFollowing = {
        setup: setupMatchFollowing
    };
})();