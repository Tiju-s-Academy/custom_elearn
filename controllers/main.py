from odoo import http
from odoo.http import request
import json
import logging
import time

_logger = logging.getLogger(__name__)

class SurveyMatchFollowing(http.Controller):
    
    @http.route(['/survey/submit/<string:survey_token>/<string:question_id>'], 
                type='json', auth='public', website=True, csrf=False)
    def survey_submit(self, survey_token, question_id, **post):
        try:
            # Get the current survey user input (session)
            user_access_token = request.httprequest.cookies.get('survey_user_input_access_token')
            _logger.info(f"Processing submission with survey_token={survey_token}, question_id={question_id}, user_access_token={user_access_token}")
            _logger.info(f"POST data: {post}")
            
            # Find survey first
            survey = request.env['survey.survey'].sudo().search([
                ('access_token', '=', survey_token)
            ], limit=1)
            
            if not survey:
                _logger.error(f"Survey not found with token: {survey_token}")
                return []
                
            # Find user input
            user_input = self._get_user_input(survey)
            if not user_input:
                _logger.error("Could not find or create user input")
                return []
                
            # Find question
            question = self._get_question(survey, question_id)
            if not question:
                _logger.error(f"Question not found: {question_id}")
                return []
                
            # Get match data
            value_match_following = None
            if post and 'params' in post:
                params = post.get('params', {})
                value_match_following = params.get('value_match_following')
            
            if value_match_following is None:
                _logger.warning("No match following data provided")
                value_match_following = []
                
            # Convert data to required format
            if isinstance(value_match_following, str):
                try:
                    value_match_following = json.loads(value_match_following)
                except json.JSONDecodeError:
                    value_match_following = []
            
            # Save to database
            value_match_following_str = json.dumps(value_match_following)
            self._save_answer(user_input, question, value_match_following_str)
            
            # CRITICAL: Return as array, not object
            # This is the key fix - Odoo survey JS expects an array
            return [{
                'id': question.id,
                'value': value_match_following
            }]
            
        except Exception as e:
            _logger.exception(f"Error in match following submission: {str(e)}")
            return []
    
    def _get_user_input(self, survey):
        """Find or create user input for the survey"""
        user_access_token = request.httprequest.cookies.get('survey_user_input_access_token')
        user_input = False
        
        # Try to find by access token
        if user_access_token:
            user_input = request.env['survey.user_input'].sudo().search([
                ('survey_id', '=', survey.id),
                ('access_token', '=', user_access_token)
            ], limit=1)
        
        # Try to find recent inputs
        if not user_input:
            user_input = request.env['survey.user_input'].sudo().search([
                ('survey_id', '=', survey.id),
                ('state', 'in', ['new', 'in_progress'])
            ], limit=1, order="create_date DESC")
        
        # Create new if needed
        if not user_input:
            user_input = request.env['survey.user_input'].sudo().create({
                'survey_id': survey.id,
                'state': 'in_progress',
            })
        
        return user_input
    
    def _get_question(self, survey, question_id):
        """Find question by ID or default to first match following question"""
        question = None
        
        # Try by direct ID if numeric
        if question_id.isdigit():
            question = request.env['survey.question'].sudo().browse(int(question_id))
            if not question.exists() or question.survey_id.id != survey.id:
                question = None
        
        # Try to find first match following question
        if not question:
            questions = request.env['survey.question'].sudo().search([
                ('survey_id', '=', survey.id),
                ('question_type', '=', 'match_following')
            ], limit=1)
            
            if questions:
                question = questions[0]
                _logger.info(f"Using default match following question: {question.id}")
        
        return question
    
    def _save_answer(self, user_input, question, value):
        """Save match following answer to database"""
        # Find existing answer line
        line = request.env['survey.user_input.line'].sudo().search([
            ('user_input_id', '=', user_input.id),
            ('question_id', '=', question.id)
        ], limit=1)
        
        if line:
            # Update existing line
            line.sudo().write({
                'value_match_following': value,
                'answer_type': 'match_following'
            })
            _logger.info(f"Updated answer for question {question.id}")
        else:
            # Create new line
            request.env['survey.user_input.line'].sudo().create({
                'user_input_id': user_input.id,
                'question_id': question.id,
                'value_match_following': value,
                'answer_type': 'match_following'
            })
            _logger.info(f"Created new answer for question {question.id}")
    
    @http.route(['/survey/match_following/create_test'], type='http', auth='user', website=True)
    def create_match_following_test(self, **kw):
        try:
            # Create a new test survey
            survey = request.env['survey.survey'].sudo().create({
                'title': 'Match Following Test Survey',
                'access_token': 'test_match_following_' + str(int(time.time())),
                'access_mode': 'public',
                'users_login_required': False,
                'questions_layout': 'page_per_question',
                'is_time_limited': False,
            })
            
            # Create a match following question
            question = request.env['survey.question'].sudo().create({
                'title': 'Match the following items',
                'survey_id': survey.id, 
                'sequence': 1,
                'question_type': 'match_following',
                'shuffle_right_options': True,
            })
            
            # Add sample match following pairs
            pairs = [
                ('Apple', 'Fruit', 1.0),
                ('Dog', 'Animal', 1.0),
                ('Car', 'Vehicle', 1.0),
                ('Chair', 'Furniture', 1.0),
                ('Python', 'Programming Language', 1.0)
            ]
            
            for i, (left, right, score) in enumerate(pairs):
                request.env['survey.question.match'].sudo().create({
                    'question_id': question.id,
                    'sequence': i + 1,
                    'left_option': left,
                    'right_option': right,
                    'score': score
                })
            
            # Create a standard question as well for comparison
            request.env['survey.question'].sudo().create({
                'title': 'How satisfied are you with this match following functionality?',
                'survey_id': survey.id,
                'sequence': 2,
                'question_type': 'simple_choice',
                'suggested_answer_ids': [
                    (0, 0, {'value': 'Very satisfied', 'answer_score': 2}),
                    (0, 0, {'value': 'Satisfied', 'answer_score': 1}),
                    (0, 0, {'value': 'Not satisfied', 'answer_score': 0})
                ]
            })
            
            # Redirect to the new survey
            survey_url = f'/survey/start/{survey.access_token}'
            return request.redirect(survey_url)
            
        except Exception as e:
            _logger.exception(f"Error creating test survey: {str(e)}")
            return request.render('website.http_error', {
                'status_code': 500,
                'status_message': "Error creating test survey"
            })
    
    @http.route(['/survey/match_following/js'], type='http', auth='public')
    def get_match_following_js(self, **kw):
        """Serve the match following JavaScript directly"""
        return """
        document.addEventListener('DOMContentLoaded', function() {
            console.log("Match Following: Initializing");
            
            // Basic initialization code
            var matchFollowing = {
                init: function() {
                    // Find match following questions
                    var questions = document.querySelectorAll('.js_question-wrapper');
                    
                    for (var i = 0; i < questions.length; i++) {
                        var question = questions[i];
                        var questionType = question.getAttribute('data-question-type');
                        
                        if (questionType === 'match_following') {
                            console.log("Match Following: Found match following question");
                            this.setupQuestion(question);
                        }
                    }
                },
                
                setupQuestion: function(question) {
                    // Create container if not exists
                    if (!question.querySelector('.match_following_container')) {
                        var container = document.createElement('div');
                        container.className = 'match_following_container';
                        container.innerHTML = '<p>Match Following Question</p>';
                        question.appendChild(container);
                    }
                    
                    // Add basic styles
                    var style = document.createElement('style');
                    style.textContent = '.match_following_container { padding: 10px; background-color: #f8f9fa; border-radius: 4px; }';
                    document.head.appendChild(style);
                }
            };
            
            // Initialize
            matchFollowing.init();
        });
        """, {'Content-Type': 'text/javascript'}