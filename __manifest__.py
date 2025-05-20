{
    'name': 'Survey Match Following',
    'version': '17.0.1.0.0',
    'depends': ['survey'],
    'author': 'Tijus Academy',
    'category': 'Academic',
    'summary': 'Add new e-learn quiz type',
    'description': "Adds drag and drop question types in e-learn module",
    'data': [
        'security/ir.model.access.csv',
        'views/survey_question_inherit_view.xml',
        'views/survey_match_templates.xml',
    ],
    'license': 'LGPL-3',
    'application': True,
}
