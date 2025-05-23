odoo.define('custom_elearn.survey_match_following', function (require) {
    'use strict';
    
    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var ajax = require('web.ajax');
    var _t = core._t;
    
    // Register our widget
    publicWidget.registry.SurveyMatchFollowing = publicWidget.Widget.extend({
        selector: '.js_question-wrapper',
        events: {
            'dragstart .o_match_item': '_onDragStart',
            'dragend .o_match_item': '_onDragEnd',
            'dragover .o_match_questions, .o_match_answers': '_onDragOver',
            'dragleave .o_match_questions, .o_match_answers': '_onDragLeave',
            'drop .o_match_questions, .o_match_answers': '_onDrop'
        },
        
        /**
         * @override
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                // Check if this is a match following question
                var questionType = self.$el.find('input[name="question_type"]').val();
                if (questionType === 'match_following') {
                    return self._initMatchFollowing();
                }
                return Promise.resolve();
            });
        },
        
        //----------------------------------------------------------------------
        // Private
        //----------------------------------------------------------------------
        
        /**
         * Initialize match following for this question
         */
        _initMatchFollowing: function () {
            var self = this;
            
            // First check if UI is already created
            if (this.$el.find('.match_following_container').length) {
                return Promise.resolve();
            }
            
            // Get question ID
            var questionId = this._getQuestionId();
            if (!questionId) {
                console.warn("Match Following: Could not determine question ID");
                return Promise.resolve();
            }
            
            // Create UI
            return this._createMatchFollowingUI(questionId).then(function () {
                self._setupDragDrop();
                return Promise.resolve();
            });
        },
        
        /**
         * Get the question ID
         */
        _getQuestionId: function () {
            var $input = this.$el.find('input[name^="question_"]');
            if ($input.length) {
                var match = $input.attr('name').match(/question_(\d+)/);
                if (match && match[1]) {
                    return match[1];
                }
            }
            return '';
        },
        
        /**
         * Create match following UI
         */
        _createMatchFollowingUI: function (questionId) {
            var self = this;
            
            // Create container
            var $container = $('<div>', {
                'class': 'match_following_container mt-4',
                'data-question-id': questionId
            });
            
            // Create structure
            var $row = $('<div>', {'class': 'row'});
            
            // Left column
            var $leftCol = $('<div>', {'class': 'col-md-6'});
            var $leftTitle = $('<h5>').text(_t("Items"));
            var $leftZone = $('<div>', {'class': 'o_match_questions p-3 border rounded'});
            $leftCol.append($leftTitle, $leftZone);
            
            // Right column
            var $rightCol = $('<div>', {'class': 'col-md-6'});
            var $rightTitle = $('<h5>').text(_t("Match With"));
            var $rightZone = $('<div>', {'class': 'o_match_answers p-3 border rounded'});
            $rightCol.append($rightTitle, $rightZone);
            
            // Assemble UI
            $row.append($leftCol, $rightCol);
            $container.append($row);
            
            // Add to DOM
            this.$el.append($container);
            
            // Add sample items or fetch real ones
            return this._getMatchItems(questionId).then(function (items) {
                if (!items || !items.length) {
                    // Add sample items
                    self._addSampleItems($container);
                } else {
                    // Add real items
                    self._addItems($container, items);
                }
                return Promise.resolve();
            });
        },
        
        /**
         * Get match items from backend (stub - would connect to API)
         */
        _getMatchItems: function (questionId) {
            // For now just return empty, we'll use sample data
            return Promise.resolve([]);
        },
        
        /**
         * Add sample items for testing
         */
        _addSampleItems: function ($container) {
            var questionId = $container.data('question-id');
            var items = [
                { id: 'item1_' + questionId, left: 'Apple', right: 'Fruit' },
                { id: 'item2_' + questionId, left: 'Dog', right: 'Animal' },
                { id: 'item3_' + questionId, left: 'Car', right: 'Vehicle' }
            ];
            
            var $leftZone = $container.find('.o_match_questions');
            var $rightZone = $container.find('.o_match_answers');
            
            _.each(items, function(item) {
                // Create left item
                var $leftItem = $('<div>', {
                    'class': 'o_match_item mb-2 p-2 border rounded',
                    'draggable': true,
                    'data-pair-id': item.id,
                    'text': item.left
                });
                $leftZone.append($leftItem);
                
                // Create right item
                var $rightItem = $('<div>', {
                    'class': 'o_match_item mb-2 p-2 border rounded',
                    'data-pair-id': item.id,
                    'text': item.right
                });
                $rightZone.append($rightItem);
            });
        },
        
        /**
         * Add real items from data
         */
        _addItems: function ($container, items) {
            var $leftZone = $container.find('.o_match_questions');
            var $rightZone = $container.find('.o_match_answers');
            
            _.each(items, function(item) {
                // Create left item
                var $leftItem = $('<div>', {
                    'class': 'o_match_item mb-2 p-2 border rounded',
                    'draggable': true,
                    'data-pair-id': item.id,
                    'text': item.left_option
                });
                $leftZone.append($leftItem);
                
                // Create right item
                var $rightItem = $('<div>', {
                    'class': 'o_match_item mb-2 p-2 border rounded',
                    'data-pair-id': item.id,
                    'text': item.right_option
                });
                $rightZone.append($rightItem);
            });
        },
        
        /**
         * Set up drag and drop functionality
         */
        _setupDragDrop: function() {
            this.$('.o_match_item').attr('draggable', true);
        },
        
        /**
         * Update the matches and submit to server
         */
        _updateMatches: function() {
            var self = this;
            var $container = this.$('.match_following_container');
            var questionId = $container.data('question-id');
            var matches = [];
            
            $container.find('.o_match_questions .o_match_item[data-matched="true"]').each(function() {
                matches.push({
                    pair_id: $(this).data('pair-id'),
                    matched: true
                });
            });
            
            // Get the survey token
            var surveyToken = this._getSurveyToken();
            if (!surveyToken || !questionId) {
                return Promise.reject();
            }
            
            // Submit to server using Odoo's ajax
            return ajax.jsonRpc('/survey/submit/' + surveyToken + '/' + questionId, 'call', {
                value_match_following: matches
            }).then(function(result) {
                if (result && result.success) {
                    // Update UI to show success
                    self._markSuccess();
                }
                return Promise.resolve(result);
            });
        },
        
        /**
         * Mark the UI as successful
         */
        _markSuccess: function() {
            // Could add visual feedback here
        },
        
        /**
         * Get survey token from URL
         */
        _getSurveyToken: function() {
            var url = window.location.href;
            var match = url.match(/\/survey\/([^\/]+)/) || 
                       url.match(/\/begin\/([^\/]+)/) || 
                       url.match(/\/start\/([^\/]+)/);
            
            return match ? match[1] : null;
        },
        
        //----------------------------------------------------------------------
        // Handlers
        //----------------------------------------------------------------------
        
        /**
         * Handle drag start
         */
        _onDragStart: function(ev) {
            ev.originalEvent.dataTransfer.setData('text/plain', $(ev.currentTarget).data('pair-id'));
            $(ev.currentTarget).addClass('dragging');
        },
        
        /**
         * Handle drag end
         */
        _onDragEnd: function(ev) {
            $(ev.currentTarget).removeClass('dragging');
            this.$('.drop-zone-active').removeClass('drop-zone-active');
        },
        
        /**
         * Handle drag over
         */
        _onDragOver: function(ev) {
            ev.preventDefault();
            $(ev.currentTarget).addClass('drop-zone-active');
        },
        
        /**
         * Handle drag leave
         */
        _onDragLeave: function(ev) {
            $(ev.currentTarget).removeClass('drop-zone-active');
        },
        
        /**
         * Handle drop
         */
        _onDrop: function(ev) {
            ev.preventDefault();
            
            var self = this;
            var $dropZone = $(ev.currentTarget);
            $dropZone.removeClass('drop-zone-active');
            
            var pairId = ev.originalEvent.dataTransfer.getData('text/plain');
            
            if ($dropZone.hasClass('o_match_answers')) {
                // Mark question item as matched
                var $questionItem = this.$('.o_match_questions .o_match_item[data-pair-id="' + pairId + '"]');
                $questionItem.attr('data-matched', 'true').addClass('matched');
                
                // Mark answer item as matched
                var $answerItem = this.$('.o_match_answers .o_match_item[data-pair-id="' + pairId + '"]');
                $answerItem.addClass('matched');
                
                // Update matches
                this._updateMatches().then(function() {
                    // Success handling
                }).guardedCatch(function(error) {
                    console.error("Match Following: Error submitting matches", error);
                });
            }
        }
    });
    
    return {
        SurveyMatchFollowing: publicWidget.registry.SurveyMatchFollowing
    };
});

/**
 * Match Following Questions for Odoo Surveys
 * Simple implementation focusing on reliability
 */
(function() {
    'use strict';
    
    // Initialize when the DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Match Following: Ready to initialize");
        // Use setTimeout to ensure Odoo's JS has loaded
        setTimeout(initMatchFollowing, 1000);
    });
    
    // Main initialization function
    function initMatchFollowing() {
        try {
            console.log("Match Following: Initializing");
            
            // Add debug button to check if JS is working
            addDebugButton();
            
            // Find match following questions
            findAndProcessQuestions();
            
        } catch (e) {
            console.error("Match Following Error:", e);
        }
    }
    
    // Find and process match following questions
    function findAndProcessQuestions() {
        // Select possible question containers
        var questionWrappers = document.querySelectorAll('.js_question-wrapper, .o_survey_form_content .js_question');
        
        console.log("Match Following: Found " + questionWrappers.length + " question wrappers");
        
        // Process each question wrapper
        for (var i = 0; i < questionWrappers.length; i++) {
            var wrapper = questionWrappers[i];
            
            // Check if this is a match following question
            if (isMatchFollowingQuestion(wrapper)) {
                console.log("Match Following: Found match following question");
                processMatchFollowingQuestion(wrapper);
            }
        }
    }
    
    // Check if a wrapper contains a match following question
    function isMatchFollowingQuestion(wrapper) {
        // Check data attribute
        if (wrapper.getAttribute('data-question-type') === 'match_following') {
            return true;
        }
        
        // Check hidden input
        var typeInput = wrapper.querySelector('input[name="question_type"]');
        return typeInput && typeInput.value === 'match_following';
    }
    
    // Process a match following question
    function processMatchFollowingQuestion(wrapper) {
        // Skip if already processed
        if (wrapper.querySelector('.match_following_container')) {
            return;
        }
        
        // Get question ID
        var questionId = getQuestionId(wrapper);
        if (!questionId) {
            console.error("Match Following: Could not determine question ID");
            return;
        }
        
        console.log("Match Following: Processing question " + questionId);
        
        // Create match following UI
        createMatchFollowingUI(wrapper, questionId);
    }
    
    // Create the match following UI
    function createMatchFollowingUI(wrapper, questionId) {
        // Create container
        var container = document.createElement('div');
        container.className = 'match_following_container';
        container.setAttribute('data-question-id', questionId);
        
        // Create basic structure
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Items</h5>
                    <div class="match_left_items"></div>
                </div>
                <div class="col-md-6">
                    <h5>Match With</h5>
                    <div class="match_right_items"></div>
                </div>
            </div>
            <p class="text-muted mt-2 small">Drag items from left column to match with right column.</p>
        `;
        
        // Style the container
        container.style.padding = '15px';
        container.style.backgroundColor = '#f8f9fa';
        container.style.borderRadius = '4px';
        container.style.marginTop = '15px';
        
        // Add to wrapper
        wrapper.appendChild(container);
        
        // Add sample pairs
        addSamplePairs(container);
        
        // Setup drag and drop
        setupDragAndDrop(container);
    }
    
    // Add sample pairs for testing
    function addSamplePairs(container) {
        var questionId = container.getAttribute('data-question-id');
        var pairs = [
            { id: 'pair1_' + questionId, left: 'Apple', right: 'Fruit' },
            { id: 'pair2_' + questionId, left: 'Dog', right: 'Animal' },
            { id: 'pair3_' + questionId, left: 'Car', right: 'Vehicle' }
        ];
        
        var leftContainer = container.querySelector('.match_left_items');
        var rightContainer = container.querySelector('.match_right_items');
        
        if (!leftContainer || !rightContainer) return;
        
        // Style containers
        [leftContainer, rightContainer].forEach(function(elem) {
            elem.style.minHeight = '150px';
            elem.style.padding = '10px';
            elem.style.border = '1px dashed #ccc';
            elem.style.borderRadius = '4px';
            elem.style.backgroundColor = '#fff';
            elem.style.marginBottom = '10px';
        });
        
        // Add items
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            
            // Left item
            var leftItem = document.createElement('div');
            leftItem.className = 'match_item';
            leftItem.setAttribute('draggable', 'true');
            leftItem.setAttribute('data-pair-id', pair.id);
            leftItem.textContent = pair.left;
            styleMatchItem(leftItem);
            leftContainer.appendChild(leftItem);
            
            // Right item
            var rightItem = document.createElement('div');
            rightItem.className = 'match_item';
            rightItem.setAttribute('data-pair-id', pair.id);
            rightItem.textContent = pair.right;
            styleMatchItem(rightItem);
            rightContainer.appendChild(rightItem);
        }
    }
    
    // Style a match item
    function styleMatchItem(item) {
        item.style.padding = '10px';
        item.style.margin = '5px 0';
        item.style.backgroundColor = '#fff';
        item.style.border = '1px solid #ddd';
        item.style.borderRadius = '4px';
        item.style.cursor = item.hasAttribute('draggable') ? 'grab' : 'default';
    }
    
    // Setup drag and drop functionality
    function setupDragAndDrop(container) {
        // Set up draggable items
        var items = container.querySelectorAll('[draggable="true"]');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            
            // Drag start
            item.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
                this.style.opacity = '0.5';
            });
            
            // Drag end
            item.addEventListener('dragend', function() {
                this.style.opacity = '1';
            });
        }
        
        // Set up drop targets
        var rightItems = container.querySelectorAll('.match_right_items .match_item');
        for (var j = 0; j < rightItems.length; j++) {
            var target = rightItems[j];
            
            // Drag over
            target.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.style.backgroundColor = '#e8f4ff';
                this.style.borderColor = '#b8daff';
            });
            
            // Drag leave
            target.addEventListener('dragleave', function() {
                this.style.backgroundColor = '#fff';
                this.style.borderColor = '#ddd';
            });
            
            // Drop
            target.addEventListener('drop', function(e) {
                e.preventDefault();
                this.style.backgroundColor = '#fff';
                this.style.borderColor = '#ddd';
                
                var pairId = e.dataTransfer.getData('text/plain');
                if (!pairId) return;
                
                // Check if correct match
                if (this.getAttribute('data-pair-id') === pairId) {
                    // Correct match
                    this.style.backgroundColor = '#d4edda';
                    this.style.borderColor = '#c3e6cb';
                    
                    // Find and mark left item
                    var leftItem = container.querySelector('.match_left_items .match_item[data-pair-id="' + pairId + '"]');
                    if (leftItem) {
                        leftItem.style.backgroundColor = '#d4edda';
                        leftItem.style.borderColor = '#c3e6cb';
                        leftItem.setAttribute('data-matched', 'true');
                    }
                    
                    // Save match
                    saveMatches(container);
                } else {
                    // Wrong match - show error feedback briefly
                    this.style.backgroundColor = '#f8d7da';
                    this.style.borderColor = '#f5c6cb';
                    var self = this;
                    setTimeout(function() {
                        self.style.backgroundColor = '#fff';
                        self.style.borderColor = '#ddd';
                    }, 1000);
                }
            });
        }
    }
    
    // Save matches to server
    function saveMatches(container) {
        var questionId = container.getAttribute('data-question-id');
        if (!questionId) return;
        
        // Get survey token
        var surveyToken = getSurveyToken();
        if (!surveyToken) {
            console.error("Match Following: Could not determine survey token");
            return;
        }
        
        // Collect matches
        var matches = [];
        var matchedItems = container.querySelectorAll('.match_left_items .match_item[data-matched="true"]');
        for (var i = 0; i < matchedItems.length; i++) {
            var item = matchedItems[i];
            matches.push({
                pair_id: item.getAttribute('data-pair-id'),
                matched: true
            });
        }
        
        console.log("Match Following: Saving matches for question " + questionId);
        console.log("Match Following: Matches:", matches);
        
        // Send to server
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/survey/submit/' + surveyToken + '/' + questionId, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log("Match Following: Submission successful");
                } else {
                    console.error("Match Following: Submission failed:", xhr.status);
                }
            }
        };
        
        // Format data exactly as expected
        var data = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                value_match_following: matches
            },
            id: Date.now()
        };
        
        xhr.send(JSON.stringify(data));
    }
    
    // Get question ID from wrapper
    function getQuestionId(wrapper) {
        // Try data attribute
        var id = wrapper.getAttribute('data-question-id');
        
        // Try input name
        if (!id) {
            var inputs = wrapper.querySelectorAll('input[name^="question_"]');
            for (var i = 0; i < inputs.length; i++) {
                var match = inputs[i].name.match(/question_(\d+)/);
                if (match && match[1]) {
                    id = match[1];
                    break;
                }
            }
        }
        
        return id;
    }
    
    // Get survey token from URL
    function getSurveyToken() {
        var url = window.location.href;
        var match = url.match(/\/survey\/([^\/]+)/) || 
                   url.match(/\/begin\/([^\/]+)/) || 
                   url.match(/\/session\/([^\/]+)/);
        return match ? match[1] : null;
    }
    
    // Add debug button to verify JS is working
    function addDebugButton() {
        try {
            // Find a good place to add the button
            var target = document.querySelector('.o_survey_form_content');
            if (!target) return;
            
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-sm btn-secondary mt-3';
            btn.style.display = 'none'; // Hidden by default
            btn.textContent = 'Match Following Debug';
            btn.onclick = function() {
                alert('Match Following JS is working');
            };
            
            target.appendChild(btn);
        } catch (e) {
            console.error("Error adding debug button:", e);
        }
    }
})();