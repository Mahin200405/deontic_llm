from langchain_text_splitters import RecursiveCharacterTextSplitter

def legal_text_splitter():
    # tuned for legal: generous overlap preserves cross-sentence references/citations
    return RecursiveCharacterTextSplitter(
        chunk_size=1200,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", "; ", ": ", " "]
    )
