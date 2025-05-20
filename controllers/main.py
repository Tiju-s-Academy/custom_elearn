from odoo import http
from odoo.http import request
import json
import logging

_logger = logging.getLogger(__name__)

class SurveyMatchFollowing(http.Controller):
    
    @http.route(['/survey/submit/<string:survey_token>/<string:question_id>'], 
                type='json', auth='public', website=True, csrf=False)
    def survey_submit(self, survey_token, question_id, **post):
        try:
            # Get the current survey user input (session)
            user_access_token = request.httprequest.cookies.get('survey_user_input_access_token')
            _logger.info(f"Processing submission with survey_token={survey_token}, question_id={question_id}, user_access_token={user_access_token}")
            
            # Find survey first
            survey = request.env['survey.survey'].sudo().search([
                ('access_token', '=', survey_token)
            ], limit=1)
            
            if not survey:
                _logger.error(f"Survey not found with token: {survey_token}")
                return []
                
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
                return []
                
            # Get the answer value
            value_match_following = post.get('value_match_following')
            if not value_match_following:
                _logger.warning("No match following data provided")
                value_match_following = '[]'  # Default empty array
                
            # Create or update user input line
            user_input_line = request.env['survey.user_input.line'].sudo().search([
                ('user_input_id', '=', user_input.id),
                ('question_id', '=', question.id)
            ], limit=1)
            
            if user_input_line:
                user_input_line.sudo().write({
                    'value_match_following': value_match_following
                })
                _logger.info(f"Updated answer for question {question.id}")
            else:
                request.env['survey.user_input.line'].sudo().create({
                    'user_input_id': user_input.id,
                    'question_id': question.id,
                    'value_match_following': value_match_following,
                    'answer_type': 'match_following'
                })
                _logger.info(f"Created new answer for question {question.id}")
            
            # Return success
            return [{
                'id': question.id,
                'value': value_match_following
            }]
            
        except Exception as e:
            _logger.exception(f"Error in match following submission: {str(e)}")
            return []
    
    @http.route(['/survey/match_following/test'], type='http', auth='public', website=True)
    def match_following_test(self, **kw):
        """Test page for match following questions"""
        return request.render('custom_elearn.match_following_question_template')
    
    # Create a demo page to test match following
    @http.route(['/survey/match_following/demo'], type='http', auth='public', website=True)
    def match_following_demo(self, **kw):
        """Demo page for match following question type"""
        # Find any match following questions or create a sample one
        questions = request.env['survey.question'].sudo().search([
            ('question_type', '=', 'match_following')
        ], limit=1)
        
        if not questions:
            # Create a demo survey with a match following question
            survey = request.env['survey.survey'].sudo().create({
                'title': 'Match Following Demo',
                'access_token': 'demo_match_following',
                'access_mode': 'public',
            })
            
            question = request.env['survey.question'].sudo().create({
                'title': 'Match the following items',
                'survey_id': survey.id,
                'question_type': 'match_following',
                'shuffle_right_options': True,
            })
            
            # Add some pairs
            pairs = [
                ('Apple', 'Fruit'),
                ('Dog', 'Animal'),
                ('Car', 'Vehicle'),
                ('Chair', 'Furniture')
            ]
            
            for i, (left, right) in enumerate(pairs):
                request.env['survey.question.match'].sudo().create({
                    'question_id': question.id,
                    'sequence': i + 1,
                    'left_option': left,
                    'right_option': right,
                    'score': 1.0
                })
                
            questions = request.env['survey.question'].sudo().search([('id', '=', question.id)])
        
        return request.render('custom_elearn.match_following_question_template')
