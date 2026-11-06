import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('model_setup', Path(__file__).parents[1] / 'tools/model_setup.py')
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)


class ModelSetupTests(unittest.TestCase):
    def test_preserves_unrelated_configuration_and_reuses_service(self):
        original = {'version': 1, 'services': {'existing': {'type': 'oneapi', 'apiKey': 'old', 'enabled': False, 'other': 1}, 'backend': {'server': 'https://example.com'}}, 'routes': [{'service': 'backend'}], 'middlewares': {'auth': {'custom': True}}}
        merged = setup.merge_model(original, 'new')
        self.assertEqual(merged['services']['existing']['apiKey'], 'new')
        self.assertTrue(merged['services']['existing']['enabled'])
        self.assertEqual(merged['routes'], original['routes'])
        self.assertEqual(merged['middlewares'], original['middlewares'])
        self.assertEqual(merged['services']['backend'], original['services']['backend'])
        self.assertEqual(original['services']['existing']['apiKey'], 'old')

    def test_service_name_collision_does_not_overwrite(self):
        merged = setup.merge_model({'version': 1, 'services': {'model': {'server': 'https://example.com'}}, 'routes': []}, 'new')
        self.assertEqual(merged['services']['model']['server'], 'https://example.com')
        self.assertEqual(merged['services']['model_oneapi']['type'], 'oneapi')

    def test_rejects_bad_input(self):
        for data in ({}, {'model': 'x', 'key': 'short'}, {'model': 'a\nb', 'key': 'x' * 20}, {'model': 'x', 'key': 'x\ny' * 20}):
            with self.assertRaises(ValueError):
                setup.validate_input(data)
        self.assertEqual(setup.validate_input({'model': 'gpt-6.1-sol', 'key': 'x' * 20}), ('gpt-6.1-sol', 'x' * 20))


if __name__ == '__main__':
    unittest.main()
