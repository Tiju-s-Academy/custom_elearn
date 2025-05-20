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
            # Safety check for survey
            survey_sudo = request.env['survey.survey'].sudo().search([('access_token', '=', survey_token)], limit=1)
            
            if not survey_sudo:
                _logger.error(f"Survey not found: {survey_token}")
                # Return empty array instead of error object to satisfy iterable requirement
                return []
                
            # Even if the question_id is not numeric, try to find the question
            question = None
            
            # First try by ID if it's a number
            if question_id.isdigit():
                question = request.env['survey.question'].sudo().browse(int(question_id))
                if not question.exists():
                    question = None
                    
            # If not found, try to find by other identifiers
            if not question:
                # Try looking up all questions in this survey
                questions = request.env['survey.question'].sudo().search([
                    ('survey_id', '=', survey_sudo.id)
                ])
                
                # For debugging
                _logger.info(f"Looking for question: {question_id} in survey {survey_sudo.id}")
                _logger.info(f"Available questions: {[(q.id, q.title) for q in questions]}")
                
                # Try to find a match
                for q in questions:
                    # Check common identifiers
                    if (str(q.id) == question_id or 
                        (hasattr(q, 'question_id') and q.question_id == question_id) or
                        (hasattr(q, 'title') and q.title == question_id)):
                        question = q
                        break
            
            if not question:
                _logger.error(f"Question not found: {question_id}")
                # Return empty array instead of error object
                return []
                
            if question.question_type != 'match_following':
                _logger.error(f"Question {question.id} is not match_following type")
                # Return empty array instead of error object
                return []
                
            # Process the match following data
            value_match_following = post.get('value_match_following')
            if not value_match_following:
                _logger.error("No match following data provided")
                # Return empty array instead of error object
                return []
                
            # Get or create user input
            user_input = request.env['survey.user_input'].sudo().search([
                ('survey_id', '=', survey_sudo.id),
                ('access_token', '=', survey_token)
            ], limit=1)
            
            if not user_input:
                _logger.error("User session not found")
                # Return empty array instead of error object
                return []
                
            # Create or update user input line
            user_input_line = request.env['survey.user_input.line'].sudo().search([
                ('user_input_id', '=', user_input.id),
                ('question_id', '=', question.id)
            ], limit=1)
            
            if user_input_line:
                user_input_line.sudo().write({
                    'value_match_following': value_match_following
                })
            else:
                request.env['survey.user_input.line'].sudo().create({
                    'user_input_id': user_input.id,
                    'question_id': question.id,
                    'value_match_following': value_match_following,
                    'answer_type': 'match_following'
                })
            
            # Return in the format expected by survey.js - an array of results
            return [{
                'id': question.id,
                'value': value_match_following
            }]
            
        except Exception as e:
            _logger.exception(f"Error in match following submission: {str(e)}")
            # Return empty array instead of error object
            return []
