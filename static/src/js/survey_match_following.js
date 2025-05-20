odoo.define('custom_elearn.match_following', function (require) {
'use strict';

var publicWidget = require('web.public.widget');

publicWidget.registry.SurveyMatchFollowing = publicWidget.Widget.extend({
    selector: '.match_following_container',
    
    start: function () {
        this._setupDragDrop();
        return this._super.apply(this, arguments);
    },
    
    _setupDragDrop: function() {
        var self = this;
        
        // Make items draggable
        this.$('.o_match_item').attr('draggable', true);
        
        // Drag events
        this.$('.o_match_item').on('dragstart', function(e) {
            e.originalEvent.dataTransfer.setData('text/plain', $(this).data('pair-id'));
            $(this).addClass('dragging');
        });
        
        this.$('.o_match_item').on('dragend', function() {
            $('.dragging').removeClass('dragging');
            $('.drop-zone-active').removeClass('drop-zone-active');
        });
        
        // Drop zone events
        this.$('.o_match_questions, .o_match_answers').on('dragover', function(e) {
            e.preventDefault();
            $(this).addClass('drop-zone-active');
        });
        
        this.$('.o_match_questions, .o_match_answers').on('dragleave', function() {
            $(this).removeClass('drop-zone-active');
        });
        
        this.$('.o_match_questions, .o_match_answers').on('drop', function(e) {
            e.preventDefault();
            var pairId = e.originalEvent.dataTransfer.getData('text/plain');
            
            if ($(this).hasClass('o_match_answers')) {
                // Match the item
                self.$('.o_match_questions .o_match_item[data-pair-id="' + pairId + '"]')
                    .attr('data-matched', 'true')
                    .addClass('matched');
                
                // Update input value
                self._updateMatchesInput();
            }
            
            // Clean up
            $('.dragging').removeClass('dragging');
            $(this).removeClass('drop-zone-active');
        });
    },
    
    _updateMatchesInput: function() {
        var matches = [];
        
        this.$('.o_match_questions .o_match_item[data-matched="true"]').each(function() {
            matches.push({
                pair_id: $(this).data('pair-id'),
                matched: true
            });
        });
        
        this.$('input[type="hidden"]').val(JSON.stringify(matches));
    }
});

/**
 * Match Following Questions for Odoo Surveys
 * 
 * This script implements drag and drop functionality for match following questions
 */
(function() {
    'use strict';
    
    // Wait for DOM to load before initializing
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWhenReady);
    } else {
        initWhenReady();
    }
    
    // Initialize match following when ready
    function initWhenReady() {
        console.log("Match Following: Initializing");
        setTimeout(setupMatchFollowing, 1000);
    }

    // Main setup function
    function setupMatchFollowing() {
        try {
            // Find all match following containers
            const containers = document.querySelectorAll('.match_following_container');
            console.log(`Match Following: Found ${containers.length} containers`);
            
            // Create containers if none found
            if (containers.length === 0) {
                createMatchFollowingContainers();
                return;
            }
            
            // Initialize each container
            for (let i = 0; i < containers.length; i++) {
                setupDragDrop(containers[i]);
            }
        } catch (error) {
            console.error("Match Following: Error in setup", error);
        }
    }
    
    // Create match following containers
    function createMatchFollowingContainers() {
        try {
            console.log("Match Following: Creating containers");
            
            // Find survey questions
            const questionElems = document.querySelectorAll('.js_question-wrapper');
            let createdCount = 0;
            
            // Check each question
            for (let i = 0; i < questionElems.length; i++) {
                const elem = questionElems[i];
                
                // Get question ID and type
                let questionId = elem.getAttribute('data-question-id');
                let questionType = '';
                
                // Try to find question type
                const typeInput = elem.querySelector('input[name="question_type"]');
                if (typeInput) {
                    questionType = typeInput.value;
                }
                
                // Try to get ID from input name if not found directly
                if (!questionId) {
                    const inputs = elem.querySelectorAll('input[name^="question_"]');
                    if (inputs.length > 0) {
                        const nameMatch = inputs[0].name.match(/question_(\d+)/);
                        if (nameMatch && nameMatch[1]) {
                            questionId = nameMatch[1];
                        }
                    }
                }
                
                // Create UI if this is a match following question
                if ((questionType === 'match_following' || (questionId && !elem.querySelector('.match_following_container'))) && 
                    !elem.querySelector('.match_following_container')) {
                    createMatchFollowingUI(elem, questionId);
                    createdCount++;
                }
            }
            
            // If containers created, setup again after a delay
            if (createdCount > 0) {
                console.log(`Match Following: Created ${createdCount} containers`);
                setTimeout(setupMatchFollowing, 500);
            } else {
                console.log("Match Following: No containers created");
                // Add test container for demo purposes
                createTestContainer();
            }
        } catch (error) {
            console.error("Match Following: Error creating containers", error);
        }
    }
    
    // Create a test container for demonstration
    function createTestContainer() {
        console.log("Match Following: Creating test container");
        
        // Find a good place to add test container
        const target = document.querySelector('.o_survey_form .js_question, .o_survey_form, #wrap');
        
        if (!target) {
            console.log("Match Following: No suitable target found for test container");
            return;
        }
        
        // Create test wrapper
        const testWrapper = document.createElement('div');
        testWrapper.className = 'js_question-wrapper test-match-following';
        testWrapper.setAttribute('data-question-id', 'test123');
        
        // Create heading
        const heading = document.createElement('h4');
        heading.textContent = 'Match Following (Test)';
        testWrapper.appendChild(heading);
        
        // Add to page
        target.appendChild(testWrapper);
        
        // Create match following UI
        createMatchFollowingUI(testWrapper, 'test123');
        
        // Setup drag and drop
        setTimeout(() => {
            const container = testWrapper.querySelector('.match_following_container');
            if (container) {
                setupDragDrop(container);
            }
        }, 500);
    }
    
    // Create match following UI
    function createMatchFollowingUI(wrapper, questionId) {
        try {
            console.log(`Match Following: Creating UI for question ${questionId}`);
            
            // Create container div
            const container = document.createElement('div');
            container.className = 'match_following_container';
            container.setAttribute('data-question-id', questionId);
            
            // Create inner HTML structure
            container.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h5>Items</h5>
                        <div class="o_match_questions"></div>
                    </div>
                    <div class="col-md-6">
                        <h5>Match With</h5>
                        <div class="o_match_answers"></div>
                    </div>
                </div>
                <input type="hidden" name="question_${questionId}" value="[]">
                <p class="text-muted small">Drag items from left to right to match them correctly.</p>
            `;
            
            // Apply some basic styles directly
            const style = container.style;
            style.padding = '15px';
            style.backgroundColor = '#f9f9f9';
            style.borderRadius = '4px';
            style.margin = '15px 0';
            
            // Style the drop zones
            const dropZones = container.querySelectorAll('.o_match_questions, .o_match_answers');
            for (let i = 0; i < dropZones.length; i++) {
                const zone = dropZones[i];
                zone.style.minHeight = '150px';
                zone.style.border = '1px dashed #ccc';
                zone.style.padding = '10px';
                zone.style.backgroundColor = '#fff';
                zone.style.borderRadius = '4px';
                zone.style.marginBottom = '10px';
            }
            
            // Append to wrapper
            wrapper.appendChild(container);
            
            // Add sample pairs
            addSamplePairs(container, questionId);
            
            return container;
        } catch (error) {
            console.error("Match Following: Error creating UI", error);
        }
    }
    
    // Add sample pairs for testing
    function addSamplePairs(container, questionId) {
        try {
            console.log(`Match Following: Adding sample pairs for question ${questionId}`);
            
            // Sample data
            const pairs = [
                { id: 'pair1_' + questionId, left: 'Apple', right: 'Fruit' },
                { id: 'pair2_' + questionId, left: 'Dog', right: 'Animal' },
                { id: 'pair3_' + questionId, left: 'Car', right: 'Vehicle' }
            ];
            
            const leftZone = container.querySelector('.o_match_questions');
            const rightZone = container.querySelector('.o_match_answers');
            
            if (!leftZone || !rightZone) {
                console.error("Match Following: Drop zones not found");
                return;
            }
            
            // Create left items
            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                
                // Left item
                const leftItem = document.createElement('div');
                leftItem.className = 'o_match_item';
                leftItem.setAttribute('draggable', 'true');
                leftItem.setAttribute('data-pair-id', pair.id);
                leftItem.textContent = pair.left;
                
                // Style the item
                leftItem.style.backgroundColor = '#fff';
                leftItem.style.border = '1px solid #dee2e6';
                leftItem.style.padding = '10px';
                leftItem.style.margin = '5px 0';
                leftItem.style.borderRadius = '4px';
                leftItem.style.cursor = 'grab';
                
                leftZone.appendChild(leftItem);
                
                // Right item
                const rightItem = document.createElement('div');
                rightItem.className = 'o_match_item';
                rightItem.setAttribute('draggable', 'true');
                rightItem.setAttribute('data-pair-id', pair.id);
                rightItem.textContent = pair.right;
                
                // Style the item
                rightItem.style.backgroundColor = '#fff';
                rightItem.style.border = '1px solid #dee2e6';
                rightItem.style.padding = '10px';
                rightItem.style.margin = '5px 0';
                rightItem.style.borderRadius = '4px';
                rightItem.style.cursor = 'grab';
                
                rightZone.appendChild(rightItem);
            }
        } catch (error) {
            console.error("Match Following: Error adding sample pairs", error);
        }
    }
    
    // Set up drag and drop
    function setupDragDrop(container) {
        try {
            console.log("Match Following: Setting up drag and drop");
            
            // Check if already initialized
            if (container.getAttribute('data-initialized') === 'true') {
                console.log("Match Following: Container already initialized");
                return;
            }
            
            // Mark as initialized
            container.setAttribute('data-initialized', 'true');
            
            // Set up draggable items
            const items = container.querySelectorAll('.o_match_item');
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                
                // Make draggable and add event listeners
                item.setAttribute('draggable', 'true');
                
                // Drag start event
                item.addEventListener('dragstart', function(e) {
                    console.log("Match Following: Drag started");
                    e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
                    this.style.opacity = '0.5';
                });
                
                // Drag end event
                item.addEventListener('dragend', function() {
                    console.log("Match Following: Drag ended");
                    this.style.opacity = '1';
                });
            }
            
            // Set up drop zones
            const dropZones = container.querySelectorAll('.o_match_questions, .o_match_answers');
            for (let i = 0; i < dropZones.length; i++) {
                const zone = dropZones[i];
                
                // Drag over event - needed to allow dropping
                zone.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    this.style.backgroundColor = '#e8f4ff';
                    this.style.borderColor = '#b8daff';
                });
                
                // Drag leave event
                zone.addEventListener('dragleave', function() {
                    this.style.backgroundColor = '#fff';
                    this.style.borderColor = '#ccc';
                });
                
                // Drop event
                zone.addEventListener('drop', function(e) {
                    e.preventDefault();
                    console.log("Match Following: Item dropped");
                    
                    // Reset styles
                    this.style.backgroundColor = '#fff';
                    this.style.borderColor = '#ccc';
                    
                    // Get the pair ID
                    const pairId = e.dataTransfer.getData('text/plain');
                    if (!pairId) {
                        console.error("Match Following: No pair ID found in drop event");
                        return;
                    }
                    
                    // Only process if dropped in answers zone
                    if (this.classList.contains('o_match_answers')) {
                        // Mark left item as matched
                        const leftItem = container.querySelector(`.o_match_questions .o_match_item[data-pair-id="${pairId}"]`);
                        if (leftItem) {
                            leftItem.setAttribute('data-matched', 'true');
                            leftItem.style.backgroundColor = '#d4edda';
                            leftItem.style.borderColor = '#c3e6cb';
                        }
                        
                        // Mark right item as matched
                        const rightItem = container.querySelector(`.o_match_answers .o_match_item[data-pair-id="${pairId}"]`);
                        if (rightItem) {
                            rightItem.style.backgroundColor = '#d4edda';
                            rightItem.style.borderColor = '#c3e6cb';
                        }
                        
                        // Update and save matches
                        updateMatches(container);
                    }
                });
            }
            
            console.log("Match Following: Drag and drop setup complete");
        } catch (error) {
            console.error("Match Following: Error setting up drag and drop", error);
        }
    }
    
    // Update matches and save to hidden input
    function updateMatches(container) {
        try {
            console.log("Match Following: Updating matches");
            
            // Find all matched items
            const matches = [];
            const matchedItems = container.querySelectorAll('.o_match_questions .o_match_item[data-matched="true"]');
            
            for (let i = 0; i < matchedItems.length; i++) {
                const item = matchedItems[i];
                const pairId = item.getAttribute('data-pair-id');
                
                // Add to matches array
                matches.push({
                    pair_id: pairId,
                    matched: true
                });
            }
            
            // Find hidden input
            const input = container.querySelector('input[type="hidden"]');
            if (input) {
                // Update input value
                const matchesJson = JSON.stringify(matches);
                input.value = matchesJson;
                
                console.log("Match Following: Updated input value", matchesJson);
                
                // Submit to server
                submitMatches(container, matches);
            }
        } catch (error) {
            console.error("Match Following: Error updating matches", error);
        }
    }
    
    // Submit matches to server
    function submitMatches(container, matches) {
        try {
            console.log("Match Following: Submitting matches to server");
            
            // Get question ID
            const questionId = container.getAttribute('data-question-id');
            if (!questionId) {
                console.error("Match Following: No question ID found");
                return;
            }
            
            // Get survey token
            const token = getSurveyToken();
            if (!token) {
                console.error("Match Following: No survey token found");
                return;
            }
            
            console.log(`Match Following: Submitting for question ${questionId}, token ${token}`);
            
            // Create request data
            const data = {
                jsonrpc: "2.0",
                method: "call",
                params: {
                    value_match_following: JSON.stringify(matches)
                },
                id: Math.floor(Math.random() * 1000000)
            };
            
            // Make AJAX request
            const xhr = new XMLHttpRequest();
            xhr.open("POST", `/survey/submit/${token}/${questionId}`, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        console.log("Match Following: Submission successful");
                    } else {
                        console.error("Match Following: Submission failed", xhr.status);
                    }
                }
            };
            
            xhr.send(JSON.stringify(data));
        } catch (error) {
            console.error("Match Following: Error submitting matches", error);
        }
    }
    
    // Get survey token from URL
    function getSurveyToken() {
        try {
            const url = window.location.href;
            
            // Try different patterns
            const patterns = [
                /\/survey\/([^\/]+)/,
                /\/begin\/([^\/]+)/,
                /\/start\/([^\/]+)/
            ];
            
            for (let i = 0; i < patterns.length; i++) {
                const match = url.match(patterns[i]);
                if (match && match[1]) {
                    return match[1];
                }
            }
            
            return null;
        } catch (error) {
            console.error("Match Following: Error getting survey token", error);
            return null;
        }
    }
    
    // Export functions to window for debugging
    window.matchFollowing = {
        init: setupMatchFollowing,
        test: createTestContainer
    };
})();