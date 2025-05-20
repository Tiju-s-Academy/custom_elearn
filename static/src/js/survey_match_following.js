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
 * Survey Match Following Implementation
 * Handles drag-and-drop functionality for match following questions
 */
(function() {
    'use strict';
    
    // Initialize when document is ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log("MatchFollowing: Document ready");
        setTimeout(initMatchFollowing, 1000);
    });
    
    // Main initialization function
    function initMatchFollowing() {
        console.log("MatchFollowing: Initializing");
        
        // Find survey container
        var surveyForm = document.querySelector('.o_survey_form');
        if (!surveyForm) {
            console.log("MatchFollowing: No survey form found");
            return;
        }
        
        // Find or create match following containers
        var questions = surveyForm.querySelectorAll('.js_question-wrapper');
        console.log(`MatchFollowing: Found ${questions.length} questions`);
        
        // Add match following UI
        var matchCount = 0;
        questions.forEach(function(question) {
            if (addMatchFollowingUI(question)) {
                matchCount++;
            }
        });
        
        console.log(`MatchFollowing: Added ${matchCount} match following UI components`);
        
        // Add styles
        addStyles();
    }
    
    // Add match following UI to a question
    function addMatchFollowingUI(questionElem) {
        // Skip if already processed
        if (questionElem.querySelector('.match_following_container')) {
            return false;
        }
        
        // Check if this is a match following question
        var questionType = questionElem.getAttribute('data-question-type');
        var inputType = questionElem.querySelector('input[name="question_type"]');
        if (inputType) {
            questionType = inputType.value;
        }
        
        // Only proceed for match following questions
        if (questionType !== 'match_following' && !questionElem.classList.contains('js_match_question')) {
            return false;
        }
        
        console.log("MatchFollowing: Found match following question");
        
        // Get question ID
        var questionId = getQuestionId(questionElem);
        if (!questionId) {
            console.log("MatchFollowing: Could not determine question ID");
            return false;
        }
        
        // Create container
        var container = document.createElement('div');
        container.className = 'match_following_container';
        container.setAttribute('data-question-id', questionId);
        
        // Basic HTML structure
        container.innerHTML = 
            '<div class="match_following_content">' +
                '<div class="row">' +
                    '<div class="col-md-6">' +
                        '<h5>Items</h5>' +
                        '<div class="match_items match_left"></div>' +
                    '</div>' +
                    '<div class="col-md-6">' +
                        '<h5>Match With</h5>' +
                        '<div class="match_items match_right"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="match_status mt-3"></div>' +
            '</div>';
        
        // Add to question
        questionElem.appendChild(container);
        
        // Load match items
        loadMatchItems(container);
        
        return true;
    }
    
    // Load match items for a container
    function loadMatchItems(container) {
        var questionId = container.getAttribute('data-question-id');
        var surveyToken = getSurveyToken();
        
        if (!questionId || !surveyToken) {
            console.log("MatchFollowing: Missing question ID or survey token");
            addDemoItems(container);
            return;
        }
        
        // Call API to get match data
        callRpc('/survey/get_match_data/' + surveyToken + '/' + questionId, {}, function(response) {
            if (response && response.pairs) {
                renderMatchItems(container, response.pairs, response.shuffle_left, response.shuffle_right);
            } else {
                console.log("MatchFollowing: No match data returned");
                addDemoItems(container);
            }
        });
    }
    
    // Add demo items for testing
    function addDemoItems(container) {
        var pairs = [
            { id: 1, left_option: 'Apple', right_option: 'Fruit' },
            { id: 2, left_option: 'Dog', right_option: 'Animal' },
            { id: 3, left_option: 'Car', right_option: 'Vehicle' }
        ];
        renderMatchItems(container, pairs, true, true);
    }
    
    // Render match items in container
    function renderMatchItems(container, pairs, shuffleLeft, shuffleRight) {
        var leftContainer = container.querySelector('.match_left');
        var rightContainer = container.querySelector('.match_right');
        
        if (!leftContainer || !rightContainer) return;
        
        // Clear containers
        leftContainer.innerHTML = '';
        rightContainer.innerHTML = '';
        
        // Copy arrays for shuffling
        var leftItems = pairs.map(function(p) { 
            return { id: p.id, text: p.left_option };
        });
        
        var rightItems = pairs.map(function(p) { 
            return { id: p.id, text: p.right_option };
        });
        
        // Shuffle if needed
        if (shuffleLeft) {
            leftItems = shuffleArray(leftItems);
        }
        
        if (shuffleRight) {
            rightItems = shuffleArray(rightItems);
        }
        
        // Render left items
        leftItems.forEach(function(item) {
            var itemElement = document.createElement('div');
            itemElement.className = 'match_item';
            itemElement.setAttribute('draggable', 'true');
            itemElement.setAttribute('data-item-id', item.id);
            itemElement.textContent = item.text;
            
            // Add drag events
            itemElement.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', item.id);
                this.classList.add('dragging');
            });
            
            itemElement.addEventListener('dragend', function() {
                this.classList.remove('dragging');
            });
            
            leftContainer.appendChild(itemElement);
        });
        
        // Render right items
        rightItems.forEach(function(item) {
            var itemElement = document.createElement('div');
            itemElement.className = 'match_item';
            itemElement.setAttribute('data-item-id', item.id);
            itemElement.textContent = item.text;
            
            // Set up as drop zone
            itemElement.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drag-over');
            });
            
            itemElement.addEventListener('dragleave', function() {
                this.classList.remove('drag-over');
            });
            
            itemElement.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('drag-over');
                
                var itemId = e.dataTransfer.getData('text/plain');
                if (!itemId) return;
                
                // Check if this is the correct match
                if (itemId == item.id) {
                    // Mark as matched
                    this.classList.add('matched');
                    
                    // Find and mark left item
                    var leftItem = leftContainer.querySelector('[data-item-id="' + itemId + '"]');
                    if (leftItem) {
                        leftItem.classList.add('matched');
                    }
                    
                    // Save match
                    saveMatch(container, itemId);
                } else {
                    // Wrong match - show feedback
                    this.classList.add('wrong-match');
                    setTimeout(function() {
                        itemElement.classList.remove('wrong-match');
                    }, 1000);
                }
            });
            
            rightContainer.appendChild(itemElement);
        });
        
        // Set up drag and drop for the containers
        setupContainerDrop(leftContainer, rightContainer);
    }
    
    // Set up container drop handlers
    function setupContainerDrop(leftContainer, rightContainer) {
        // Make right container a drop zone
        rightContainer.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over-container');
        });
        
        rightContainer.addEventListener('dragleave', function() {
            this.classList.remove('drag-over-container');
        });
        
        rightContainer.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over-container');
        });
    }
    
    // Save a match
    function saveMatch(container, itemId) {
        var questionId = container.getAttribute('data-question-id');
        var surveyToken = getSurveyToken();
        
        if (!questionId || !surveyToken) return;
        
        // Get all matched items
        var matches = [];
        var matchedItems = container.querySelectorAll('.match_left .match_item.matched');
        
        matchedItems.forEach(function(item) {
            matches.push({
                item_id: item.getAttribute('data-item-id'),
                matched: true
            });
        });
        
        // Save matches
        callRpc('/survey/submit_match/' + surveyToken + '/' + questionId, {
            matches: matches
        }, function(response) {
            if (response && response.success) {
                updateMatchStatus(container, matches);
            } else if (response && response.error) {
                console.error("MatchFollowing: Error saving match:", response.error);
            }
        });
    }
    
    // Update match status display
    function updateMatchStatus(container, matches) {
        var statusDiv = container.querySelector('.match_status');
        if (!statusDiv) return;
        
        var total = container.querySelectorAll('.match_left .match_item').length;
        var matched = matches.length;
        
        if (matched === total) {
            statusDiv.innerHTML = '<div class="alert alert-success">All items matched correctly!</div>';
        } else {
            statusDiv.innerHTML = '<div class="text-muted">' + matched + ' of ' + total + ' items matched</div>';
        }
    }
    
    // Helper function to call RPC
    function callRpc(url, params, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                var response = null;
                try {
                    response = JSON.parse(xhr.responseText);
                } catch (e) {
                    console.error("MatchFollowing: Error parsing response", e);
                }
                
                if (callback) {
                    callback(response && response.result ? response.result : response);
                }
            }
        };
        
        xhr.send(JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: params,
            id: new Date().getTime()
        }));
    }
    
    // Helper function to get question ID
    function getQuestionId(element) {
        // Try data attribute
        var id = element.getAttribute('data-question-id');
        
        // Try input name
        if (!id) {
            var inputs = element.querySelectorAll('input[name^="question_"]');
            if (inputs.length > 0) {
                var match = inputs[0].name.match(/question_(\d+)/);
                if (match && match[1]) {
                    id = match[1];
                }
            }
        }
        
        return id;
    }
    
    // Helper function to get survey token
    function getSurveyToken() {
        var url = window.location.href;
        var match = url.match(/\/survey\/([^\/]+)/) || 
                   url.match(/\/begin\/([^\/]+)/) || 
                   url.match(/\/start\/([^\/]+)/);
                   
        return match ? match[1] : null;
    }
    
    // Helper function to shuffle array
    function shuffleArray(array) {
        var shuffled = array.slice();
        for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = temp;
        }
        return shuffled;
    }
    
    // Add CSS styles
    function addStyles() {
        var style = document.createElement('style');
        style.textContent = `
            .match_following_container {
                margin: 15px 0;
                padding: 15px;
                background-color: #f9f9f9;
                border-radius: 4px;
                border: 1px solid #eee;
            }
            .match_items {
                min-height: 150px;
                padding: 10px;
                border: 1px dashed #ccc;
                border-radius: 4px;
                background-color: #fff;
            }
            .match_item {
                margin: 5px 0;
                padding: 10px;
                background-color: #fff;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: grab;
            }
            .match_left .match_item {
                cursor: grab;
            }
            .match_item.dragging {
                opacity: 0.5;
            }
            .match_item.matched {
                background-color: #d4edda;
                border-color: #c3e6cb;
            }
            .match_item.wrong-match {
                background-color: #f8d7da;
                border-color: #f5c6cb;
            }
            .match_item.drag-over {
                background-color: #e8f4ff;
                border-color: #b8daff;
            }
            .drag-over-container {
                background-color: #f8f9fa;
                border-color: #ddd;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Export for debugging
    window.matchFollowing = {
        init: initMatchFollowing
    };
})();