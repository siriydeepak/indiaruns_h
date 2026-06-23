import json
import random

first_names = [
    "Rahul","Priya","Arjun","Sneha","Vikram",
    "Ananya","Karan","Neha","Aditi","Rohan",
    "Varun","Ishita","Meera","Sanjay","Akash"
]

last_names = [
    "Sharma","Patel","Reddy","Gupta",
    "Kumar","Nair","Iyer","Singh",
    "Joshi","Verma"
]

skills_pool = [
    "Python",
    "Java",
    "C++",
    "SQL",
    "Machine Learning",
    "Deep Learning",
    "TensorFlow",
    "PyTorch",
    "FastAPI",
    "Docker",
    "AWS",
    "Azure",
    "Data Analysis",
    "Power BI",
    "Tableau",
    "React",
    "Node.js",
    "Git",
    "Linux",
    "Kubernetes"
]

colleges = [
    "IIT Delhi",
    "IIT Bombay",
    "NIT Trichy",
    "RVCE",
    "PES University",
    "BMS College",
    "MS Ramaiah",
    "VIT Vellore",
    "SRM University",
    "Manipal Institute of Technology"
]

cities = [
    "Bangalore",
    "Mumbai",
    "Delhi",
    "Hyderabad",
    "Chennai",
    "Pune",
    "Kolkata",
    "Ahmedabad"
]

career_paths = [
    ["Intern"],
    ["Intern", "Software Engineer"],
    ["Software Engineer"],
    ["Software Engineer", "Senior Engineer"],
    ["Software Engineer", "Senior Engineer", "Lead"],
    ["Data Analyst"],
    ["Data Analyst", "ML Engineer"],
    ["ML Engineer"],
    ["ML Engineer", "Senior ML Engineer"],
    ["Backend Developer"],
    ["Backend Developer", "Lead Backend Developer"]
]

candidates = []

for i in range(100):

    years = random.randint(0, 10)

    profile = {
        "candidate_id": f"C{i+1:03}",

        "name": (
            random.choice(first_names)
            + " "
            + random.choice(last_names)
        ),

        "skills": random.sample(
            skills_pool,
            random.randint(4, 8)
        ),

        "years_experience": years,

        "job_titles": random.choice(
            career_paths
        ),

        "college_name": random.choice(
            colleges
        ),

        "city": random.choice(
            cities
        )
    }

    candidates.append(profile)

with open(
    "mock_candidates.json",
    "w"
) as file:

    json.dump(
        candidates,
        file,
        indent=4
    )

print(
    "100 mock candidates generated successfully."
)