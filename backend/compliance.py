# Logic for compliance checking

class ComplianceAdvisor:
    def __init__(self):
        self.suggestions = []
        self.score = 100

    def _deduct_score(self, points, message):
        self.score = max(0, self.score - points)
        self.suggestions.append(message)

    def evaluate(self, resource):
        self.score = 100
        self.suggestions = []

        # 1. Security Check
        if not resource.get("encrypted", False):
            self._deduct_score(30, "[Security] Resource is not encrypted.")
        
        # 2. Network Check
        sg = resource.get("security_group", {})
        if "0.0.0.0/0" in sg.get("allowed_cidrs", []):
            self._deduct_score(40, "[Security] Port open to the world (0.0.0.0/0).")

        # 3. Cost Check
        if resource.get("environment") == "dev" and resource.get("instance_type") in ["large", "xlarge"]:
            self._deduct_score(20, "[Cost] Use 'micro' or 'small' for Dev environments.")

        return {
            "status": "PASSED" if self.score >= 80 else "FAILED",
            "compliance_score": self.score,
            "suggestions": self.suggestions
        }