from odoo import http
from odoo.http import request
from odoo.addons.survey.controllers.main import Survey
import json
import logging
import random

_logger = logging.getLogger(__name__)

class SurveyMatchFollowing(Survey):
    
    @http.route(['/survey/submit/<string:survey_token>/<string:question_id>'], 
                type='json', auth='public', website=True, csrf=False)
    def survey_submit(self, survey_token, question_id, **post):
        try:
            # Find the survey
            survey_sudo = request.env['survey.survey'].sudo().search([('access_token', '=', survey_token)], limit=1)
            if not survey_sudo:
                _logger.error(f"Survey not found: {survey_token}")
                return []
                
            # Find the question
            question = None
            if question_id.isdigit():
                question = request.env['survey.question'].sudo().browse(int(question_id))
                if not question.exists() or question.survey_id.id != survey_sudo.id:
                    question = None
                    
            # If not found by ID, try to find match_following questions
            if not question:
                questions = request.env['survey.question'].sudo().search([
                    ('survey_id', '=', survey_sudo.id),
                    ('question_type', '=', 'match_following')
                ])
                
                if questions:
                    # Use the first one we find
                    question = questions[0]
            
            if not question:
                _logger.error(f"Question not found for ID: {question_id}")
                return []
                
            # Get the user session
            user_input = request.env['survey.user_input'].sudo().search([
                ('survey_id', '=', survey_sudo.id),
                ('access_token', '=', survey_token)
            ], limit=1)
            
            if not user_input:
                _logger.error("Survey session not found")
                return []
            
            # Process the match following data
            value_match_following = post.get('value_match_following')
            if not value_match_following:
                _logger.error("No match following data received")
                return []
                
            # Find or create the answer line
            user_input_line = request.env['survey.user_input.line'].sudo().search([
                ('user_input_id', '=', user_input.id),
                ('question_id', '=', question.id)
            ], limit=1)
            
            if user_input_line:
                user_input_line.write({
                    'value_match_following': value_match_following
                })
            else:
                request.env['survey.user_input.line'].sudo().create({
                    'user_input_id': user_input.id,
                    'question_id': question.id,
                    'value_match_following': value_match_following,
                    'answer_type': 'match_following'
                })
            
            # Return success result in the expected format
            return [{
                'id': question.id,
                'value': value_match_following
            }]
            
        except Exception as e:
            _logger.exception(f"Error processing match following submission: {str(e)}")
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
