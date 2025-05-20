{
    'name': 'Survey Match Following',
    'version': '17.0.1.0.0',
    'depends': [
        'base',
        'web',
        'survey',
        'website',
    ],
    'author': 'Tijus Academy',
    'category': 'Academic',
    'summary': 'Add new e-learn quiz type',
    'description': "Adds drag and drop question types in e-learn module",
    'data': [
        'security/ir.model.access.csv',
        'views/survey_question_inherit_view.xml',
        'views/survey_question_type_extension.xml',
        'views/assets.xml',
        # Use the dedicated survey match assets
        'views/survey_match_assets.xml',
        'views/direct_inject.xml',
        'views/fallback_assets.xml',
    ],
    'assets': {
        'survey.survey_assets': [
            '/custom_elearn/static/src/js/survey_match_following.js',
            '/custom_elearn/static/src/css/survey_match_following.css',
        ],
    },
    'license': 'LGPL-3',
    'application': True,
}
