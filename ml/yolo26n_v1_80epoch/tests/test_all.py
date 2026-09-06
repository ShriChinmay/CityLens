import unittest
from pathlib import Path
import json

class TestProd(unittest.TestCase):
    def test_weights_exist(self):
        self.assertTrue(Path("weights/best.pt").exists(), "weights/best.pt missing")

    def test_metrics_gate(self):
        m = json.load(open("yolo26n_100ep_metrics.json"))
        self.assertGreaterEqual(m["mAP50"], 0.75, f"mAP {m['mAP50']} < 0.75")
        self.assertGreaterEqual(m["P"], 0.70)
        self.assertGreaterEqual(m["R"], 0.60)

    def test_data_labels(self):
        root = Path("/home/himanshu/Downloads/archive(1)/valid/labels")
        if not root.exists():
            self.skipTest("local dataset not present (CI)")
        for t in list(root.glob("*.txt"))[:50]:
            for line in open(t):
                p = line.split()
                self.assertEqual(len(p), 5, f"{t.name}: {line}")
                _, cx, cy, w, h = map(float, p)
                self.assertTrue(0 <= cx <= 1 and 0 <= cy <= 1 and 0 < w <= 1 and 0 < h <= 1)

    def test_src_imports(self):
        import ast
        for f in Path("src").glob("*.py"):
            ast.parse(open(f).read(), filename=str(f))

if __name__ == "__main__":
    unittest.main()
