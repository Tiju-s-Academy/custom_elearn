{
    'name': 'Survey Match Following',
    'version': '17.0.1.0.0',
    'depends': ['survey'],
    'author': 'Tijus Academy',
    'category': 'Academic',
    'summary': 'Add new e-learn quiz type',
    'description': """
        Adds match following question type to surveys.
        Allows creating drag and drop matching questions.
    """,
    'data': [
        'security/ir.model.access.csv',
        'views/survey_question_inherit_view.xml',
        'views/survey_question_templates.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            '/custom_elearn/static/src/js/survey_match_following.js',
        ],
    },
    'installable': True,
    'application': False,
}
