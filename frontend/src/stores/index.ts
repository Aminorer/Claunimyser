export const useStores = () => {
  const document = useDocumentStore();
  const entities = useEntitiesStore();
  const ui = useUIStore();
  
  return { document, entities, ui };
};