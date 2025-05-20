from odoo import http
from odoo.http import request
import json
import logging
import re

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
            
            # Extract data from the post
            value_match_following = post.get('value_match_following')
            if not value_match_following:
                _logger.error("No match following data provided")
                return []
                
            # Get user input (survey session)
            user_input = request.env['survey.user_input'].sudo().search([
                ('survey_id', '=', survey_sudo.id),
                ('access_token', '=', survey_token)
            ], limit=1)
            
            if not user_input:
                _logger.error("User session not found")
                return []
            
            # In Odoo 17, the question_id is likely the frontend page_id rather than the database ID
            # Let's try to find the question in multiple ways
            
            # Get all questions in this survey
            questions = request.env['survey.question'].sudo().search([
                ('survey_id', '=', survey_sudo.id),
                ('question_type', '=', 'match_following')
            ])
            
            # Log available questions for debugging
            _logger.info(f"Looking for question: {question_id} in survey {survey_sudo.id}")
            _logger.info(f"Available match_following questions: {[(q.id, q.title) for q in questions]}")
            
            # If we have only one match_following question, use that one
            if len(questions) == 1:
                question = questions[0]
                _logger.info(f"Using the only match_following question: {question.id} - {question.title}")
            else:
                # Try finding by ID or by other means
                question = None
                
                # Try direct ID
                if question_id.isdigit():
                    question = request.env['survey.question'].sudo().browse(int(question_id))
                    if not question.exists() or question.survey_id.id != survey_sudo.id:
                        question = None
                
                # Try other approaches if still not found
                if not question:
                    # Check all questions for a match
                    for q in questions:
                        # Let's extract any actual numeric ID that might be in the string
                        uuid_match = re.search(r'question_(\d+)', question_id)
                        if uuid_match:
                            potential_id = int(uuid_match.group(1))
                            if q.id == potential_id:
                                question = q
                                break
                
                # If still not found, just use the first one with match_following type
                if not question and questions:
                    question = questions[0]
                    _logger.warning(f"Could not find exact question match for {question_id}, using first match_following question: {question.id}")
            
            if not question:
                _logger.error(f"No match_following questions found in survey {survey_sudo.id}")
                return []
                
            # Process the match following data
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
            
            # Return in the format expected by survey.js - an array of results
            return [{
                'id': question.id,
                'value': value_match_following
            }]
            
        except Exception as e:
            _logger.exception(f"Error in match following submission: {str(e)}")
            # Return empty array instead of error object
            return []
