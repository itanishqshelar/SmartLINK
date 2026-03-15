from fastapi.responses import StreamingResponse
import zipfile
import io

@app.get("/documents/download-all", tags=["Documents"])
def download_all_documents(domain: str | None = None):
    """
    Download all documents (optionally filtered by domain) as a ZIP archive.
    """
    with Session(engine) as session:
        query = select(Document)
        if domain:
            if domain not in ALLOWED_DOMAINS:
                raise HTTPException(status_code=400, detail="Invalid domain.")
            query = query.where(Document.domain == domain)
        
        docs = session.exec(query).all()
    
    if not docs:
        raise HTTPException(status_code=404, detail="No documents found matching the filter.")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for doc in docs:
            file_path = UPLOADS_DIR / doc.doc_id / doc.filename
            if file_path.exists():
                # Add file to zip with its original filename
                # If multiple files have the same name, zipfile handles it or we can prefix with doc_id
                # For better UX, let's prefix with domain folder structure or just root
                # actually, prefixing ensures uniqueness if filenames clash across folders (but we only store flatly per doc_id)
                # Let's just put them in the root of the zip for now.
                zip_file.write(file_path, arcname=doc.filename)
            else:
                print(f"Warning: File {file_path} missing on disk.")

    zip_buffer.seek(0)
    
    filename = f"{domain}_documents.zip" if domain else "all_documents.zip"
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
