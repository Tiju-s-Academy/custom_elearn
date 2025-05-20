// This script helps inject match following containers when needed
(function() {
    'use strict';
    
    // Wait for the DOM and Odoo to be fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        // Give extra time for Odoo to render everything
        setTimeout(injectMatchFollowing, 1000);
    });
    
    function injectMatchFollowing() {
        console.log('Checking for match following questions to inject...');
        
        // Find survey question containers
        const questionWrappers = document.querySelectorAll('.o_survey_form .js_question-wrapper');
        
        // Process each question
        questionWrappers.forEach(function(wrapper) {
            // Check if this is a match_following type question
            const questionTypeInput = wrapper.querySelector('input[name="question_type"]');
            if (!questionTypeInput) return;
            
            const questionType = questionTypeInput.value;
            if (questionType === 'match_following') {
                console.log('Found match following question, injecting container');
                
                // Create the match following container if it doesn't already exist
                if (!wrapper.querySelector('.match_following_container')) {
                    createMatchFollowingContainer(wrapper);
                }
            }
        });
    }
    
    function createMatchFollowingContainer(wrapper) {
        // Get the question ID
        const questionIdMatch = wrapper.id ? wrapper.id.match(/\d+/) : null;
        const questionId = questionIdMatch ? questionIdMatch[0] : null;
        
        if (!questionId) {
            console.warn('Could not determine question ID for match following container');
            return;
        }
        
        // Create the match following container structure
        const container = document.createElement('div');
        container.className = 'match_following_container';
        container.setAttribute('data-question-id', questionId);
        
        // Create the rows and columns
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        
        // Left column (questions)
        const leftCol = document.createElement('div');
        leftCol.className = 'col-md-6';
        
        const leftTitle = document.createElement('h5');
        leftTitle.textContent = 'Items';
        
        const questionsDiv = document.createElement('div');
        questionsDiv.className = 'o_match_questions';
        
        leftCol.appendChild(leftTitle);
        leftCol.appendChild(questionsDiv);
        
        // Right column (answers)
        const rightCol = document.createElement('div');
        rightCol.className = 'col-md-6';
        
        const rightTitle = document.createElement('h5');
        rightTitle.textContent = 'Matches';
        
        const answersDiv = document.createElement('div');
        answersDiv.className = 'o_match_answers';
        
        rightCol.appendChild(rightTitle);
        rightCol.appendChild(answersDiv);
        
        // Add columns to row
        rowDiv.appendChild(leftCol);
        rowDiv.appendChild(rightCol);
        
        // Add row to container
        container.appendChild(rowDiv);
        
        // Add hidden input for storing data
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = `question_${questionId}`;
        hiddenInput.value = '[]';
        
        container.appendChild(hiddenInput);
        
        // Add the container to the wrapper
        wrapper.appendChild(container);
        
        console.log('Match following container created for question', questionId);
        
        // Initialize drag and drop
        if (window.customElearnMatchFollowing && window.customElearnMatchFollowing.setup) {
            window.customElearnMatchFollowing.setup();
        }
    }
})();
