import streamlit as st
from agent import answer_question

# Set the title of the Streamlit app
st.title("Codebase Explorer")

# Create sidebar elements for user input
repo_path = st.sidebar.text_input("Repository Path", value=".")  # Default to current directory
question = st.sidebar.text_input("Question about the codebase")

# Button to trigger the answer generation
if st.sidebar.button("Get Answer"):
    # Check if both repository path and question are provided
    if repo_path and question:
        st.write(f"Repository Path: {repo_path}")
        st.write(f"Question: {question}")
        try:
            # Get the answer from the agent
            answer = answer_question(repo_path, question)
            st.write("Answer:")
            st.write(answer)
        except Exception as e:
            st.write(f"An error occurred: {e}")
    else:
        st.write("Please provide both a repository path and a question.")

# Button to run predefined tests
if st.button("Run Tests"):
    st.write("Running tests...")
    # Define test cases
    test_cases = [
        (".", "List files"),
        (".", "Read main.py"),
        (".", "Search for Streamlit"),
    ]
    # Iterate through test cases and display results
    for repo_path, question in test_cases:
        st.write(f"Testing: Repo Path='{repo_path}', Question='{question}'")
        try:
            # Get the answer from the agent for the test case
            answer = answer_question(repo_path, question)
            st.write("Test Result:")
            st.write(answer)
        except Exception as e:
            st.write(f"Test Failed: {e}")
