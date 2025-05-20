{
    'name': 'Survey Match Following',
    'version': '17.0.1.0.0',
    'depends': [
        'base',
        'web',
        'survey',
    ],
    'author': 'Tijus Academy',
    'category': 'Academic',
    'summary': 'Add new e-learn quiz type',
    'description': "Adds drag and drop question types in e-learn module",
    'data': [
        'security/ir.model.access.csv',
        'views/survey_question_inherit_view.xml',
        'views/survey_match_templates.xml',
    ],
    'assets': {
        'survey.survey_assets': [
            'custom_elearn/static/src/js/survey_match_following.js',
        ],
    },
    'license': 'LGPL-3',
    'application': True,
}
