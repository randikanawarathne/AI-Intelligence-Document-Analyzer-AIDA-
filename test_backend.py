"""
Automated End-to-End Test Suite for AIDA FastAPI Backend
"""

import os
import sys
import io
import time
import unittest
from fastapi.testclient import TestClient

# Add workspace to path
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("./backend"))

from backend.main import app

client = TestClient(app)

class TestAIDA(unittest.TestCase):
    def test_01_health_and_stats(self):
        res = client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "online")
        self.assertIn("vectors", data)

        res_stats = client.get("/stats")
        self.assertEqual(res_stats.status_code, 200)
        stats = res_stats.json()
        self.assertIn("embedding_model", stats)
        print("[OK] Health & Stats verified.")

    def test_02_upload_and_chunk(self):
        sample_doc = b"""EXECUTIVE CYBER INTELLIGENCE REPORT
Threat Actor APT29 (Cozy Bear) exploited vulnerability CVE-2024-38812 on target server 194.26.29.112.
The organization Department of Defense reported unauthorized cryptocurrency transfers of $4,200,000 USD to Swiss Bank Zurich in Geneva, Switzerland.
Malicious domain auth-gateway-internal.com was observed communicating with C2 nodes."""

        file_obj = io.BytesIO(sample_doc)
        res = client.post(
            "/upload",
            files={"file": ("apt29_threat_report.txt", file_obj, "text/plain")}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreater(data["chunks"], 0)
        print(f"[OK] Upload verified: Ingested {data['chunks']} chunks in {data['elapsed_s']}s.")

    def test_03_query_rag(self):
        res = client.post(
            "/query",
            json={"query": "What CVE was exploited by APT29 and how much money was transferred?"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("answer", data)
        self.assertGreater(len(data["citations"]), 0)
        print(f"[OK] Query verified: Retrieved {len(data['citations'])} citations in {data['latency_ms']}ms.")

    def test_04_intel_graph_and_entities(self):
        res_ent = client.get("/intel/entities")
        self.assertEqual(res_ent.status_code, 200)
        ents = res_ent.json()["entities"]
        self.assertIn("threat_actors", ents)
        self.assertIn("cves", ents)

        res_graph = client.get("/intel/graph")
        self.assertEqual(res_graph.status_code, 200)
        graph = res_graph.json()
        self.assertGreater(len(graph["nodes"]), 0)
        print(f"[OK] Knowledge graph & entities verified: {len(graph['nodes'])} nodes, {len(graph['edges'])} edges.")

    def test_05_export_dossier(self):
        res = client.post(
            "/export/dossier",
            json={"title": "Test Briefing", "classification": "SECRET"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("markdown", data)
        print("[OK] Dossier generation verified.")

    def test_06_delete_document(self):
        res = client.delete("/documents/apt29_threat_report.txt")
        self.assertEqual(res.status_code, 200)
        print("[OK] Document deletion verified.")

if __name__ == "__main__":
    unittest.main()
