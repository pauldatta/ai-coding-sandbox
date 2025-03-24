from tools import list_files, read_files, grep

def answer_question(repo_path, question):
    """
    Answers a question about the codebase using available tools.

    Args:
        repo_path (str): The path to the repository.
        question (str): The question about the codebase.

    Returns:
        str: The answer to the question, or an error message if the question cannot be answered.
    """
    question = question.lower()

    if "list files" in question or "files" in question and "in the repository" in question:
        files = list_files(repo_path)
        if isinstance(files, str) and files.startswith("Error"):  # Check for error message
            return files
        return "Files in the repository:\n" + "\n".join(files)
    
    elif "read" in question and ("file" in question or "content" in question or "of" in question):
        try:
            if "content of" in question:
                filename = question.split("content of")[-1].strip().replace("'", "").replace('"', "")
            else:
                filename = question.split("read")[-1].strip().replace("'", "").replace('"', "").replace("file", "").strip()
            if not filename:
                return "I need a filename to read. Please specify which file."
            contents = read_files([filename])
            if isinstance(contents, str) and contents.startswith("Error"):
                return contents
            return f"Content of '{filename}':\n" + contents[0] if contents else f"File '{filename}' is empty."
        except Exception as e:
            return f"Error processing file reading request: {e}"

    elif "search" in question or "grep" in question or "find" in question:
        try:
            if "search" in question:
                search_term = question.split("search")[-1].strip().replace("for", "").replace("'", "").replace('"', "")
            elif "grep" in question:
                search_term = question.split("grep")[-1].strip().replace("for", "").replace("'", "").replace('"', "")
            else:  # "find"
                search_term = question.split("find")[-1].strip().replace("'", "").replace('"', "")
            if not search_term:
                return "I need a search term. Please specify what to search for."
            results = grep(search_term, repo_path)
            if isinstance(results, str) and results.startswith("Error"):
                return results
            return f"Search results for '{search_term}':\n" + results if results else f"No results found for '{search_term}'."
        except Exception as e:
            return f"Error processing search request: {e}"

    else:
        return "I can only answer questions about listing files, reading file contents, or searching for text within files."
