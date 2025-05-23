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
                return {'error': 'Survey not found'}
                
            # Find user input in two ways:
            # 1. Using the user access token from cookie
            user_input = False
            if user_access_token:
                user_input = request.env['survey.user_input'].sudo().search([
                    ('survey_id', '=', survey.id),
                    ('access_token', '=', user_access_token)
                ], limit=1)
            
            # 2. If not found, try using the survey token
            if not user_input:
                user_input = request.env['survey.user_input'].sudo().search([
                    ('survey_id', '=', survey.id),
                    ('access_token', '=', survey_token)
                ], limit=1)
            
            # 3. Last resort - find most recent user input for this survey
            if not user_input:
                user_input = request.env['survey.user_input'].sudo().search([
                    ('survey_id', '=', survey.id),
                    ('state', 'in', ['new', 'in_progress'])
                ], limit=1, order="create_date DESC")
            
            if not user_input:
                # If still not found, create a new session
                _logger.warning(f"No existing session found, creating new one for survey {survey.id}")
                user_input = request.env['survey.user_input'].sudo().create({
                    'survey_id': survey.id,
                    'partner_id': request.env.user.partner_id.id if not request.env.user._is_public() else False,
                    'state': 'in_progress',
                })
            
            _logger.info(f"Found/Created user_input (session) with ID: {user_input.id}, state: {user_input.state}")
            
            # Find question
            question = None
            if question_id.isdigit():
                question = request.env['survey.question'].sudo().browse(int(question_id))
                if not question.exists() or question.survey_id.id != survey.id:
                    question = None
            
            # If not found by ID, try other methods
            if not question:
                questions = request.env['survey.question'].sudo().search([
                    ('survey_id', '=', survey.id),
                    ('question_type', '=', 'match_following')
                ])
                
                if questions:
                    # Use the first match following question found
                    question = questions[0]
                    _logger.info(f"Using default match following question: {question.id}")
            
            if not question:
                _logger.error(f"Question not found: {question_id}")
                return {'error': 'Question not found'}
                
            # Get the match following data
            value_match_following = None
            
            # Get data from params
            if post and 'params' in post:
                params = post.get('params', {})
                value_match_following = params.get('value_match_following')
            
            # Handle value format
            if isinstance(value_match_following, list):
                # Already a list, use as is
                _logger.info(f"Found match following data as list")
            elif isinstance(value_match_following, str):
                # Parse JSON string
                try:
                    value_match_following = json.loads(value_match_following)
                    _logger.info(f"Parsed match following data from string")
                except (json.JSONDecodeError, TypeError):
                    _logger.warning("Invalid JSON format for match following data")
                    value_match_following = []
            else:
                _logger.warning("No match following data provided")
                value_match_following = []
                
            _logger.info(f"Match following data: {value_match_following}")
            
            # Convert to string for database storage
            value_match_following_str = json.dumps(value_match_following)
            
            # Create or update user input line
            user_input_line = request.env['survey.user_input.line'].sudo().search([
                ('user_input_id', '=', user_input.id),
                ('question_id', '=', question.id)
            ], limit=1)
            
            if user_input_line:
                # Update existing answer
                user_input_line.sudo().write({
                    'value_match_following': value_match_following_str,
                    'answer_type': 'match_following'
                })
                _logger.info(f"Updated answer for question {question.id}")
            else:
                # Create new answer line
                request.env['survey.user_input.line'].sudo().create({
                    'user_input_id': user_input.id,
                    'question_id': question.id,
                    'value_match_following': value_match_following_str,
                    'answer_type': 'match_following'
                })
                _logger.info(f"Created new answer for question {question.id}")
            
            # Find next question
            next_question = False
            next_questions = request.env['survey.question'].sudo().search([
                ('survey_id', '=', survey.id),
                ('sequence', '>', question.sequence)
            ], order="sequence", limit=1)
            
            if next_questions:
                next_question = next_questions[0].id
            
            # Return in the format expected by Odoo's survey engine
            # This must be an ARRAY, not an object!
            return [{
                'id': question.id,
                'value': value_match_following
            }]
            
        except Exception as e:
            _logger.exception(f"Error in match following submission: {str(e)}")
            # Return empty array instead of error object to prevent iteration error
            return []

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