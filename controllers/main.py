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
            # Log all incoming parameters for debugging
            _logger.info(f"Survey submit: token={survey_token}, question_id={question_id}, post={post}")
            
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
                
            # Find the question - first try by ID
            question = None
            
            if question_id.isdigit():
                question = request.env['survey.question'].sudo().browse(int(question_id))
                if not question.exists() or question.survey_id.id != survey_sudo.id:
                    question = None
            
            # If not found by direct ID, try to find by other methods
            if not question:
                # Get all questions in this survey
                questions = request.env['survey.question'].sudo().search([
                    ('survey_id', '=', survey_sudo.id),
                    ('question_type', '=', 'match_following')
                ])
                
                if not questions:
                    _logger.error(f"No match_following questions found in survey {survey_sudo.id}")
                    return []
                
                # Try to find by pattern match in question_id
                if question_id:
                    # Try to extract numeric ID if it's embedded in the string
                    id_match = re.search(r'(\d+)', question_id)
                    if id_match:
                        numeric_id = int(id_match.group(1))
                        for q in questions:
                            if q.id == numeric_id:
                                question = q
                                break
                
                # If still not found, use first match_following question
                if not question and questions:
                    question = questions[0]
                    _logger.info(f"Using first match_following question: {question.id}")
            
            if not question:
                _logger.error(f"Question not found and no match_following questions available")
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
                _logger.info(f"Updated answer for question {question.id}")
            else:
                request.env['survey.user_input.line'].sudo().create({
                    'user_input_id': user_input.id,
                    'question_id': question.id,
                    'value_match_following': value_match_following,
                    'answer_type': 'match_following'
                })
                _logger.info(f"Created new answer for question {question.id}")
            
            # Return an array with a single result to satisfy the iterable requirement
            return [{
                'id': question.id,
                'value': value_match_following
            }]
            
        except Exception as e:
            _logger.exception(f"Error in match following submission: {str(e)}")
            # Return empty array instead of error object
            return []

    # Add direct page to render match following questions for testing
    @http.route(['/survey_match_following/test'], type='http', auth='public', website=True)
    def match_following_test(self, **kw):
        return request.render('custom_elearn.match_following_test_page', {
            'questions': request.env['survey.question'].sudo().search([('question_type', '=', 'match_following')])
        })
