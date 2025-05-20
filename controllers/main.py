from odoo import http
from odoo.http import request
import json
import logging
import time  # Add this import for the time.time() function

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
                
            # Find or create user input (session)
            user_input = self._get_user_input(survey)
            if not user_input:
                return {'error': 'Could not create survey session'}
                
            # Find question
            question = self._get_question(survey, question_id)
            if not question:
                return {'error': 'Question not found'}
                
            # Get match data
            matches = []
            if post and 'matches' in post:
                matches_data = post.get('matches')
                
                if isinstance(matches_data, str):
                    try:
                        matches = json.loads(matches_data)
                    except:
                        _logger.warning("Invalid JSON data for matches")
                elif isinstance(matches_data, list):
                    matches = matches_data
                    
            _logger.info(f"Matches data: {matches}")
            
            # Save the answer
            matches_json = json.dumps(matches)
            self._save_match_answer(user_input, question, matches_json)
            
            return {'success': True, 'question_id': question.id, 'matches': matches}
            
        except Exception as e:
            _logger.exception(f"Error in match following submission: {e}")
            return {'error': str(e)}
    
    def _get_user_input(self, survey):
        """Get or create a user input (session) for the survey"""
        user_access_token = request.httprequest.cookies.get('survey_user_input_access_token')
        
        # Search by user access token
        user_input = False
        if user_access_token:
            user_input = request.env['survey.user_input'].sudo().search([
                ('survey_id', '=', survey.id),
                ('access_token', '=', user_access_token)
            ], limit=1)
        
        # Search by recent inputs
        if not user_input:
            user_input = request.env['survey.user_input'].sudo().search([
                ('survey_id', '=', survey.id),
                ('state', 'in', ['new', 'in_progress'])
            ], limit=1, order="create_date DESC")
        
        # Create new input if needed
        if not user_input:
            _logger.info(f"Creating new user input for survey {survey.id}")
            user_input = request.env['survey.user_input'].sudo().create({
                'survey_id': survey.id,
                'state': 'in_progress',
            })
            
        _logger.info(f"Using user input {user_input.id}")
        return user_input
    
    def _get_question(self, survey, question_id):
        """Get the question by ID or find the first match following question"""
        question = None
        
        # Try by ID if numeric
        if question_id.isdigit():
            question = request.env['survey.question'].sudo().browse(int(question_id))
            if not question.exists() or question.survey_id.id != survey.id:
                question = None
                
        # Find first match following question
        if not question:
            question = request.env['survey.question'].sudo().search([
                ('survey_id', '=', survey.id),
                ('question_type', '=', 'match_following')
            ], limit=1)
            
        if question:
            _logger.info(f"Found question {question.id}")
            
        return question
    
    def _save_match_answer(self, user_input, question, value):
        """Save the match following answer"""
        # Find existing answer line
        line = request.env['survey.user_input.line'].sudo().search([
            ('user_input_id', '=', user_input.id),
            ('question_id', '=', question.id)
        ], limit=1)
        
        if line:
            _logger.info(f"Updating existing answer for question {question.id}")
            line.sudo().write({
                'value_match_following': value,
                'answer_type': 'match_following'
            })
        else:
            _logger.info(f"Creating new answer for question {question.id}")
            request.env['survey.user_input.line'].sudo().create({
                'user_input_id': user_input.id,
                'question_id': question.id,
                'value_match_following': value,
                'answer_type': 'match_following'
            })
            
        return True

    @http.route(['/survey/get_match_data/<string:survey_token>/<string:question_id>'], 
                type='json', auth='public', website=True)
    def get_match_data(self, survey_token, question_id, **kw):
        """Get match following data for a question"""
        try:
            # Find survey
            survey = request.env['survey.survey'].sudo().search([
                ('access_token', '=', survey_token)
            ], limit=1)
            
            if not survey:
                return {'error': 'Survey not found'}
                
            # Find question
            question = self._get_question(survey, question_id)
            if not question:
                return {'error': 'Question not found'}
                
            # Get match pairs
            pairs = []
            for pair in question.match_following_pairs:
                pairs.append({
                    'id': pair.id,
                    'left_option': pair.left_option,
                    'right_option': pair.right_option
                })
                
            return {
                'question_id': question.id,
                'pairs': pairs,
                'shuffle_left': question.shuffle_left_options,
                'shuffle_right': question.shuffle_right_options
            }
            
        except Exception as e:
            _logger.exception(f"Error getting match data: {e}")
            return {'error': str(e)}