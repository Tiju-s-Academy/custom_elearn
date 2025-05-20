/** @odoo-module **/

import { registry } from '@web/core/registry';
import publicWidget from 'web.public.widget';
import { _t } from 'web.core';

// For Odoo 17, we need to use the correct module structure
publicWidget.registry.SurveyMatchFollowing = publicWidget.Widget.extend({
    selector: '.match_following_container',
    events: {
        'dragstart .o_match_item': '_onDragStart',
        'dragover .o_match_questions, .o_match_answers': '_onDragOver',
        'dragleave .o_match_questions, .o_match_answers': '_onDragLeave',
        'drop .o_match_questions, .o_match_answers': '_onDrop',
        'dragend .o_match_item': '_onDragEnd'
    },

    start: function () {
        var def = this._super.apply(this, arguments);
        // Initialize the match following functionality
        console.log("Survey Match Following initialized");
        this._setupDragDrop();
        this._loadStoredAnswers();
        return def;
    },

    _setupDragDrop: function() {
        // Initialize drag and drop for all items
        this.$('.o_match_item').each(function() {
            $(this).attr('draggable', true);
        });
    },
    
    _loadStoredAnswers: function() {
        const storedValue = this.$('input[type="hidden"]').val();
        if (storedValue) {
            try {
                const matches = JSON.parse(storedValue);
                // Process and display stored matches
                matches.forEach(match => {
                    const pairId = match.pair_id;
                    if (pairId) {
                        // Move items to their saved positions
                        const $item = this.$(`.o_match_questions .o_match_item[data-pair-id="${pairId}"]`);
                        if ($item.length) {
                            $item.attr('data-matched', 'true');
                            $item.addClass('matched');
                        }
                    }
                });
            } catch (e) {
                console.error("Failed to load stored matches", e);
            }
        }
    },

    _onDragStart: function (ev) {
        ev.originalEvent.dataTransfer.setData('text/plain', $(ev.currentTarget).data('pair-id'));
        $(ev.currentTarget).addClass('dragging');
    },

    _onDragOver: function (ev) {
        ev.preventDefault();
        ev.originalEvent.dataTransfer.dropEffect = 'move';
        $(ev.currentTarget).addClass('drop-zone-active');
    },
    
    _onDragLeave: function (ev) {
        $(ev.currentTarget).removeClass('drop-zone-active');
    },
    
    _onDragEnd: function (ev) {
        this.$('.dragging').removeClass('dragging');
        this.$('.drop-zone-active').removeClass('drop-zone-active');
    },

    _onDrop: function (ev) {
        ev.preventDefault();
        const pairId = ev.originalEvent.dataTransfer.getData('text/plain');
        const $item = this.$(`.o_match_item[data-pair-id="${pairId}"]`);
        const $target = $(ev.currentTarget);
        
        // Handle dropping in answer column (matching)
        if ($target.hasClass('o_match_answers')) {
            // Mark the question item as matched
            const $questionItem = this.$(`.o_match_questions .o_match_item[data-pair-id="${pairId}"]`);
            $questionItem.attr('data-matched', 'true');
            $questionItem.addClass('matched');
            
            // Remove existing highlight on previously matched answers
            this.$('.o_match_answers .matched-with-' + pairId).removeClass('matched-with-' + pairId);
            
            // Highlight the answer item
            const $answerItem = this.$(`.o_match_answers .o_match_item[data-pair-id="${pairId}"]`);
            $answerItem.addClass('matched');
            $answerItem.addClass('matched-with-' + pairId);
        }
        
        // Update the hidden input with matches
        this._updateMatches();
        
        $item.removeClass('dragging');
        $target.removeClass('drop-zone-active');
    },

    _updateMatches: function() {
        const matches = [];
        
        // Collect all matched pairs
        this.$('.o_match_questions .o_match_item[data-matched="true"]').each(function() {
            const pairId = $(this).data('pair-id');
            matches.push({
                pair_id: pairId,
                matched: true
            });
        });
        
        // Update the hidden input with the JSON value
        this.$('input[type="hidden"]').val(JSON.stringify(matches));
        
        // Trigger custom event for survey form to handle
        this.trigger_up('user_changed_answer', {
            question_type: 'match_following',
            value: JSON.stringify(matches)
        });
    }
});

// For Odoo 17, we need to ensure survey.form is available before extending it
// Let's create a separate module for this
odoo.define('custom_elearn.survey_form_extension', function (require) {
    'use strict';
    
    var core = require('web.core');
    var publicWidget = require('web.public.widget');
    
    // Try to load the survey form module if it exists
    var SurveyFormWidget;
    try {
        SurveyFormWidget = require('survey.form');
    } catch (e) {
        console.error("Could not load survey.form module:", e);
        return {};
    }
    
    if (SurveyFormWidget) {
        // Only extend if the module was loaded
        SurveyFormWidget.include({
            /**
             * Override to handle match following questions
             */
            _prepareSubmitValues: function (formData, params) {
                var result = this._super.apply(this, arguments);
                
                // Add handling for match following questions
                this.$('.js_question-wrapper').each(function () {
                    var $questionWrapper = $(this);
                    var $matchFollowingContainer = $questionWrapper.find('.match_following_container');
                    
                    if ($matchFollowingContainer.length) {
                        var questionId = $questionWrapper.data('questionId');
                        var value = $matchFollowingContainer.find('input[type="hidden"]').val();
                        
                        if (value) {
                            formData.append('question_' + questionId, value);
                            params.push({
                                name: 'question_' + questionId,
                                value: value,
                                type: 'match_following'
                            });
                        }
                    }
                });
                
                return result;
            }
        });
    }
    
    return {};
});

//# sourceMappingURL=survey_match_following.js.map

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