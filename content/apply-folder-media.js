/* Applies images discovered in each project's organized image folders. */
(() => {
  const discoveredProjects = window.folderMedia?.projects || {};

  Object.entries(discoveredProjects).forEach(([projectId, media]) => {
    const project = window.siteData?.projects.find((item) => item.id === projectId);
    if (!project) return;

    const managedPrefix = `content/projects/${project.folder}/images/`;
    const existingGallery = project.folderGalleryOnly ? [] : project.gallery.filter((image) => !image.src.startsWith(managedPrefix));

    if (media.cover) project.cover = media.cover;
    project.gallery = [...existingGallery, ...media.gallery];

    if (projectId === "france-luxe-campaigns") {
      // Curate the generated folder gallery around this project's email work.
      const emailImages = project.gallery.filter((image) => image.alt.toLowerCase().includes("email"));
      const otherImages = project.gallery.filter((image) => !image.alt.toLowerCase().includes("email"));
      project.gallery = [
        ...emailImages.map((image) => ({ ...image, section: "Email design" })),
        ...otherImages.map((image) => ({ ...image, section: "Campaign extensions" }))
      ];
    }

    if (projectId === "somatic-living-creative-system") {
      // Hide the temporary social-image stand-in until a real dashboard capture is available.
      project.gallery = project.gallery.filter((image) => image.section !== "Digital & web");
    }
  });
})();
