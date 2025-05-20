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

(function() {
    'use strict';
    
    // Initialize when the DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        initMatchFollowing();
    });
    
    // Main initialization function
    function initMatchFollowing() {
        // Find all match following containers
        var containers = document.querySelectorAll('.match_following_container');
        if (containers.length === 0) return;
        
        // Set up each container
        containers.forEach(function(container) {
            setupDragDrop(container);
        });
    }
    
    // Set up drag and drop for a container
    function setupDragDrop(container) {
        // Make items draggable
        var items = container.querySelectorAll('.o_match_item');
        items.forEach(function(item) {
            item.setAttribute('draggable', true);
            
            // Add event listeners
            item.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', this.textContent);
                this.classList.add('dragging');
            });
            
            item.addEventListener('dragend', function() {
                this.classList.remove('dragging');
            });
        });
        
        // Set up drop zones
        var dropZones = container.querySelectorAll('.o_match_questions, .o_match_answers');
        dropZones.forEach(function(zone) {
            zone.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drop-zone-active');
            });
            
            zone.addEventListener('dragleave', function() {
                this.classList.remove('drop-zone-active');
            });
            
            zone.addEventListener('drop', function(e) {
                e.preventDefault();
                var data = e.dataTransfer.getData('text/plain');
                
                // Get the dragged item and mark it as matched
                var draggedItem = document.querySelector('.dragging');
                if (draggedItem) {
                    draggedItem.classList.add('matched');
                    draggedItem.classList.remove('dragging');
                }
                
                this.classList.remove('drop-zone-active');
            });
        });
    }
})();
});