import os
import re

def list_files(repo_path="."):
    """
    Lists all non-hidden files and directories within the specified repository path.

    Args:
        repo_path (str): The path to the repository. Defaults to the current directory.

    Returns:
        list: A list of strings, where each string is the name of a file or directory.
              Returns an error message as a string if an error occurs.
    """
    try:
        files = [f for f in os.listdir(repo_path) if not f.startswith('.')]
        return files
    except OSError as e:
        return f"Error listing files: {e}"

def read_files(filepaths):
    """
    Reads the contents of the specified files.

    Args:
        filepaths (list): A list of filepaths to read.

    Returns:
        list: A list of strings, where each string is the content of a file.
              If a file is not found or cannot be read, an error message is included in the list for that file.
    """
    contents = []
    for filepath in filepaths:
        try:
            with open(filepath, 'r') as f:
                contents.append(f.read())
        except FileNotFoundError:
            contents.append(f"Error: File not found: {filepath}")
        except Exception as e:
            contents.append(f"Error reading {filepath}: {e}")
    return contents

def grep(pattern, repo_path="."):
    """
    Searches for the given pattern in all files within the specified repository path.

    Args:
        pattern (str): The regular expression pattern to search for.
        repo_path (str): The path to the repository. Defaults to the current directory.

    Returns:
        str: A string containing all lines that match the pattern, along with the filename and line number.
             Returns an empty string if no matches are found or an error message if an error occurs.
    """
    results = []
    try:
        for root, _, files in os.walk(repo_path):
            for file in files:
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r') as f:
                        for i, line in enumerate(f):
                            if re.search(pattern, line):
                                results.append(f"{filepath}:{i+1}:{line.strip()}")
                except UnicodeDecodeError:
                    # Skip binary files
                    pass
        return "\n".join(results)
    except OSError as e:
        return f"Error searching files: {e}"
