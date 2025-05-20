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
 * Basic Match Following implementation for Odoo surveys
 */
(function() {
    'use strict';
    
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        // Wait for survey to fully load
        setTimeout(initMatchFollowing, 1000);
    });
    
    // Main initialization function
    function initMatchFollowing() {
        console.log("Match following: Initializing");
        
        // Find survey questions
        var questions = document.querySelectorAll('.js_question-wrapper');
        if (questions.length === 0) {
            console.log("Match following: No questions found");
            return;
        }
        
        // Process each question
        for (var i = 0; i < questions.length; i++) {
            processQuestion(questions[i]);
        }
        
        // Add global styles
        addStyles();
    }
    
    // Process a single question
    function processQuestion(questionElem) {
        // Check if this might be a match following question
        var questionId = getQuestionId(questionElem);
        if (!questionId) return;
        
        // Check if already has match following container
        if (questionElem.querySelector('.match_following_container')) {
            setupExistingContainer(questionElem.querySelector('.match_following_container'));
            return;
        }
        
        // Create new match following container
        var container = createMatchFollowingContainer(questionElem, questionId);
        if container) {
            setupDragDrop(container);
        }
    }
    
    // Get question ID from element
    function getQuestionId(elem) {
        // Try data attribute first
        var questionId = elem.getAttribute('data-question-id');
        
        // If not found, try to get from input name
        if (!questionId) {
            var inputs = elem.querySelectorAll('input[name^="question_"]');
            if (inputs.length > 0) {
                var nameMatch = inputs[0].name.match(/question_(\d+)/);
                if (nameMatch && nameMatch[1]) {
                    questionId = nameMatch[1];
                }
            }
        }
        
        return questionId;
    }
    
    // Create match following container in a question
    function createMatchFollowingContainer(questionElem, questionId) {
        console.log("Match following: Creating container for question " + questionId);
        
        // Create container div
        var container = document.createElement('div');
        container.className = 'match_following_container';
        container.setAttribute('data-question-id', questionId);
        
        // Create HTML structure
        var html = '<div class="row">' +
                '<div class="col-md-6">' +
                    '<h5>Items</h5>' +
                    '<div class="o_match_questions"></div>' +
                '</div>' +
                '<div class="col-md-6">' +
                    '<h5>Match With</h5>' +
                    '<div class="o_match_answers"></div>' +
                '</div>' +
            '</div>' +
            '<input type="hidden" name="question_' + questionId + '" value="[]">' +
            '<p class="text-muted small">Drag items from left to right to match them correctly.</p>';
        
        container.innerHTML = html;
        
        // Add to question
        questionElem.appendChild(container);
        
        // Add sample items
        addSampleItems(container);
        
        return container;
    }
    
    // Set up an existing container
    function setupExistingContainer(container) {
        if (container.hasAttribute('data-setup-complete')) return;
        
        console.log("Match following: Setting up existing container");
        
        // Set up drag and drop
        setupDragDrop(container);
        
        // Mark as set up
        container.setAttribute('data-setup-complete', 'true');
    }
    
    // Add sample items to a container
    function addSampleItems(container) {
        var questionId = container.getAttribute('data-question-id');
        var leftZone = container.querySelector('.o_match_questions');
        var rightZone = container.querySelector('.o_match_answers');
        
        if (!leftZone || !rightZone) return;
        
        // Sample data
        var samples = [
            { id: 'pair1_' + questionId, left: 'Apple', right: 'Fruit' },
            { id: 'pair2_' + questionId, left: 'Dog', right: 'Animal' },
            { id: 'pair3_' + questionId, left: 'Car', right: 'Vehicle' }
        ];
        
        // Create items
        for (var i = 0; i < samples.length; i++) {
            var sample = samples[i];
            
            // Left item
            var leftItem = document.createElement('div');
            leftItem.className = 'o_match_item';
            leftItem.setAttribute('draggable', 'true');
            leftItem.setAttribute('data-pair-id', sample.id);
            leftItem.textContent = sample.left;
            leftZone.appendChild(leftItem);
            
            // Right item
            var rightItem = document.createElement('div');
            rightItem.className = 'o_match_item';
            rightItem.setAttribute('draggable', 'true');
            rightItem.setAttribute('data-pair-id', sample.id);
            rightItem.textContent = sample.right;
            rightZone.appendChild(rightItem);
        }
    }
    
    // Set up drag and drop for a container
    function setupDragDrop(container) {
        // Make items draggable
        var items = container.querySelectorAll('.o_match_item');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            
            // Make sure it's draggable
            item.setAttribute('draggable', 'true');
            
            // Add event listeners
            item.addEventListener('dragstart', function(e) {
                console.log('Match following: Drag start');
                e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
                this.classList.add('dragging');
            });
            
            item.addEventListener('dragend', function() {
                console.log('Match following: Drag end');
                this.classList.remove('dragging');
                var zones = container.querySelectorAll('.drop-zone-active');
                for (var j = 0; j < zones.length; j++) {
                    zones[j].classList.remove('drop-zone-active');
                }
            });
        }
        
        // Set up drop zones
        var zones = container.querySelectorAll('.o_match_questions, .o_match_answers');
        for (var k = 0; k < zones.length; k++) {
            var zone = zones[k];
            
            zone.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drop-zone-active');
            });
            
            zone.addEventListener('dragleave', function() {
                this.classList.remove('drop-zone-active');
            });
            
            zone.addEventListener('drop', function(e) {
                e.preventDefault();
                console.log('Match following: Item dropped');
                
                this.classList.remove('drop-zone-active');
                
                var pairId = e.dataTransfer.getData('text/plain');
                if (!pairId) {
                    console.error('Match following: No pair ID in drop data');
                    return;
                }
                
                if (this.classList.contains('o_match_answers')) {
                    // Find left item
                    var leftItem = container.querySelector('.o_match_questions .o_match_item[data-pair-id="' + pairId + '"]');
                    if (leftItem) {
                        leftItem.setAttribute('data-matched', 'true');
                        leftItem.classList.add('matched');
                        console.log('Match following: Matched left item', pairId);
                    }
                    
                    // Find right item
                    var rightItem = container.querySelector('.o_match_answers .o_match_item[data-pair-id="' + pairId + '"]');
                    if (rightItem) {
                        rightItem.classList.add('matched');
                        console.log('Match following: Matched right item', pairId);
                    }
                    
                    // Update matches
                    updateMatches(container);
                }
            });
        }
    }
    
    // Update matches in the input field and submit to server
    function updateMatches(container) {
        console.log('Match following: Updating matches');
        
        // Find matched items
        var matches = [];
        var matchedItems = container.querySelectorAll('.o_match_questions .o_match_item[data-matched="true"]');
        
        for (var i = 0; i < matchedItems.length; i++) {
            var item = matchedItems[i];
            matches.push({
                pair_id: item.getAttribute('data-pair-id'),
                matched: true
            });
        }
        
        var matchesJson = JSON.stringify(matches);
        console.log('Match following: Matches data', matchesJson);
        
        // Update hidden input
        var input = container.querySelector('input[type="hidden"]');
        if (input) {
            input.value = matchesJson;
            
            // Submit to server
            submitToServer(container, matches);
        }
    }
    
    // Submit matches to server
    function submitToServer(container, matches) {
        var questionId = container.getAttribute('data-question-id');
        var surveyToken = getSurveyToken();
        
        if (!questionId || !surveyToken) {
            console.error('Match following: Missing question ID or survey token');
            return;
        }
        
        console.log('Match following: Submitting to server', questionId, surveyToken);
        
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/survey/submit/' + surveyToken + '/' + questionId, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log('Match following: Submission successful');
                } else {
                    console.error('Match following: Submission failed', xhr.status);
                }
            }
        };
        
        var data = JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            params: {
                value_match_following: JSON.stringify(matches)
            },
            id: new Date().getTime()
        });
        
        console.log('Match following: Sending data', data);
        xhr.send(data);
    }
    
    // Get survey token from URL
    function getSurveyToken() {
        var url = window.location.href;
        
        // Try different patterns
        var patterns = [
            /\/survey\/([^\/]+)/,
            /\/begin\/([^\/]+)/,
            /\/start\/([^\/]+)/
        ];
        
        for (var i = 0; i < patterns.length; i++) {
            var match = url.match(patterns[i]);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }
    
    // Add global styles
    function addStyles() {
        var style = document.createElement('style');
        style.textContent = '' +
            '.match_following_container { padding: 15px; background-color: #f9f9f9; border-radius: 4px; margin: 15px 0; }' +
            '.o_match_questions, .o_match_answers { min-height: 150px; border: 1px dashed #ccc; padding: 10px; border-radius: 4px; background-color: #fff; margin-bottom: 10px; }' +
            '.o_match_item { background-color: #fff; border: 1px solid #dee2e6; padding: 10px; margin: 5px 0; border-radius: 4px; cursor: move; }' +
            '.o_match_item.dragging { opacity: 0.5; }' +
            '.o_match_item.matched { background-color: #d4edda; border-color: #c3e6cb; }' +
            '.drop-zone-active { background-color: #e8f4ff; border-color: #b8daff; }';
        
        document.head.appendChild(style);
    }
})();